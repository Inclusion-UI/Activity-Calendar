const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");

const { sequelize, databaseDir } = require("./sequelize");
const { models } = sequelize;

// Called when folder location changes
// Get all images of certain type in alphabetical order
// If the file doesn't exist anymore, delete the image and its copies
// Returns an array of image paths
const readImages = async (category) => {
  // declare image array
  const imageArray = [];

  // find image type by passed in image type name (e.g. 'activities')
  const type = await models.imageType.findOne({
    where: { name: category },
  });

  // get all images matching image type in alphabetical order
  const images = await models.image.findAll({
    order: [[Sequelize.fn("lower", Sequelize.col("fileName")), "ASC"]],
    raw: true,
    where: {
      imageTypeId: type.id,
    },
  });

  // for each image...
  for (const image of images) {
    // get the absolute path of the image
    const imagePath = path.join(type.location, image.fileName + image.fileType);
    // if image still exists, push the path onto the image path array
    if (fs.existsSync(imagePath))
      imageArray.push([imagePath, image.id, image.fileName]);
    // if image doesn't exist, destroy its copies and the image
    else {
      await models.imageCopy.destroy({
        where: { imageId: image.id },
      });
      await models.image.destroy({ where: { id: image.id } });
    }
  }

  // return the array of image paths to use as img src ref in front-end
  return imageArray;
};

// Called when...
//    Image is dragged onto calendar
//    Image copy is moved
// Takes in image or imagecopy id, posX, posY, weekTagId
const setImageCopy = async (
  copyId,
  baseId,
  thisPosX,
  thisPosY,
  thisWeekTagId
) => {
  // Try to find an already existing image copy with passed in id
  const imageCopy = await models.imageCopy.findOne({ where: { id: copyId } });

  // If one exists, update posX and posY
  if (imageCopy) {
    imageCopy.posX = thisPosX;
    imageCopy.posY = thisPosY;
    await imageCopy.save();
  } else {
    // Find image with passed in id
    const image = await models.image.findOne({ where: { id: baseId } });
    // Original image stored in activities (if popular)
    let baseImage;

    // If the image is of type "popular"
    if (image.imageTypeId === 3) {
      // check if a base image exists in "activities"
      baseImage = await models.image.findOne({
        where: {
          fileName: image.fileName,
          imageTypeId: {
            [Sequelize.Op.not]: 3,
          },
        },
      });
    }

    // if a base image exists, set to that id, otherwise set to popular id
    const imageId = baseImage ? baseImage.id : image.id;

    // Create image copy with set variables
    await models.imageCopy.create({
      id: copyId,
      posX: thisPosX,
      posY: thisPosY,
      imageId,
      weekTagId: thisWeekTagId,
    });
  }
};

// Called when an image is dragged and dropped onto the delete tab
// Deletes an image copy from the database
// Takes in image copy name
const deleteImageCopy = async (id) => {
  // Delete Image copy found by passed in array
  await models.imageCopy.destroy({ where: { id } });
};

// Called when app loads
// Get all image copies sorted by created date
const getImageCopies = async (thisWeekTagId) => {
  // declare image copy array
  const imageCopyArray = [];

  // get all images matching image type in order of created date
  const imageCopies = await models.imageCopy.findAll({
    order: [[Sequelize.fn("lower", Sequelize.col("createdAt")), "ASC"]],
    raw: true,
    where: {
      weekTagId: thisWeekTagId,
    },
  });

  // for each image copy...
  for (const imageCopy of imageCopies) {
    // Find base image
    const image = await models.image.findOne({
      where: { id: imageCopy.imageId },
    });

    // Find image type
    const type = await models.imageType.findOne({
      where: { id: image.imageTypeId },
    });

    // get the absolute path of the image
    const imagePath = path.join(type.location, image.fileName + image.fileType);

    // Push to image copy array
    imageCopyArray.push([
      imagePath,
      imageCopy.id,
      imageCopy.imageId,
      imageCopy.posX,
      imageCopy.posY,
      image.fileName,
      type.name,
    ]);
  }

  // return the array of image paths to use as img src ref in front-end
  return imageCopyArray;
};

// Returns the folder location path of a specific image type
const getFolderLocation = async (category) => {
  const imageType = await models.imageType.findOne({
    where: { name: category },
  });
  return imageType.location;
};

// Called when folder path is changed for specific image type
// Set customization flag in model
const updateFolderLocation = async (category, typePath) => {
  const imageType = await models.imageType.findOne({
    where: { name: category },
  });
  if (fs.existsSync(typePath))
    imageType.update({ location: typePath, isCustomized: true });
};

class ActivityCalendar {
  static _USER_SETTINGS_ID = 1;

  constructor(fs = require("fs"), verbose = false) {
    this.fs = fs;
    this.verbose = verbose;
    this.symbolImagesDir = path.join(databaseDir, "symbol-images");
    this._log(
      `Creating symbol images dir if it doesn't exist: ${this.symbolImagesDir}`
    );
    this.fs.mkdirSync(this.symbolImagesDir, { recursive: true });
  }

  async getSettings() {
    return models.settings
      .findOrCreate({ where: { id: ActivityCalendar._USER_SETTINGS_ID } })
      .then(([res]) => {
        return res.holdValue;
      });
  }

  async setSettings(holdValue) {
    return models.settings.upsert({
      id: ActivityCalendar._USER_SETTINGS_ID,
      holdValue,
    });
  }

  async getSymbols() {
    const symbols = await models.symbol.findAll({
      order: [[Sequelize.fn("lower", Sequelize.col("symbol.name")), "ASC"]],
      include: models.category,
    });

    // We only want to expose the data values.
    return symbols.map((symbol) => {
      symbol = Object.assign(symbol.dataValues, {
        imageFilePath: symbol.imageFilePath,
      });
      if (symbol.category) {
        symbol.category = symbol.category.dataValues;
      }
      return symbol;
    });
  }

  // `categoryId` is only valid for Activities.
  async createSymbol(imagePath, name, type, posX, posY, zoom, categoryId) {
    const ext = path.parse(imagePath).ext;

    // The output file name will is a random 50 character string (including the ext).
    const destFileName =
      crypto.randomBytes(50 - ext.length).toString("hex") + ext;
    const destFilePath = path.join(this.symbolImagesDir, destFileName);

    // By using COPYFILE_EXCL, the copy will fail in the incredibly rare collision case.
    await this.fs.promises.copyFile(
      imagePath,
      destFilePath,
      fs.constants.COPYFILE_EXCL
    );

    return models.symbol.create({
      name,
      imageFileName: destFileName,
      type,
      posX,
      posY,
      zoom,
      categoryId,
    });
  }

  async getSymbolPlacements(inCurrentWeek) {
    return models.symbolPlacement.findAll({ where: { inCurrentWeek } });
  }

  async createSymbolPlacement(symbolId, posX, posY, inCurrentWeek) {
    return models.symbolPlacement.create({
      symbolId,
      posX,
      posY,
      inCurrentWeek,
    });
  }

  async updateSymbolPlacement(id, posX, posY) {
    const [numRows, rows] = await models.symbolPlacement.update(
      { posX, posY },
      { where: { id } }
    );
    if (numRows === 0) {
      throw Error(
        `Unable to find existing to update symbol placement with id ${id}.`
      );
    }
  }

  async deleteSymbolPlacement(id) {
    const numDestroyed = await models.symbolPlacement.destroy({
      where: { id },
    });
    if (numDestroyed === 0) {
      throw Error(
        `Unable to find existing to delete symbol placement with id ${id}.`
      );
    }
  }

  _log(message) {
    if (this.verbose) {
      console.log(message);
    }
  }
}

module.exports = {
  readImages,
  setImageCopy,
  deleteImageCopy,
  getImageCopies,
  getFolderLocation,
  updateFolderLocation,
  ActivityCalendar,
};