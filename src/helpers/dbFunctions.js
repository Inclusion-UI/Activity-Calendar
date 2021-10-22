const sequelize = require('sequelize');
const fs = require('fs');
const path = require('path');
const process = require('process');
const { readdir } = require('fs/promises');

// Import Models
const Image = require('../models/Image');
const ImageCopy = require('../models/ImageCopy');
const ImageType = require('../models/ImageType');
const WeekTag = require('../models/WeekTag');
const { type } = require('os');

// Called when folder location changes
// Adds new images to the database
const writeImages = async (category) => {
  // find image type by passed in image type name (e.g. 'activities')
  const type = await ImageType.findOne({
    raw: true,
    where: { Name: category },
  });

  // Read the files inside current image type directory
  try {
    const files = await readdir(type.Location);
    for (const file of files) {
      const name = file.substring(0, file.length - 4);
      const extension = file.substring(file.length - 4);

      // check if the image already exists
      const image = await Image.findOne({
        where: { FileName: name },
      });

      // if the image doesn't exist, add it to the database
      if (!image) {
        await Image.create({
          FileName: name,
          FileType: extension,
          ImageTypeID: type.ID,
        });
      }
    }
  } catch (err) {
    console.error(err);
  }
};

// Called from back end when app loads
// Adds new images to database from each image type
const writeAllImages = async () => {
  const types = await ImageType.findAll();
  for (const type of types) await writeImages(type.Name);
};

// Called when folder location changes
// Get all images of certain type in alphabetical order
// If the file doesn't exist anymore, delete the image and its copies
// Returns an array of image paths
const readImages = async (category) => {
  // declare image array
  const imageArray = [];

  // find image type by passed in image type name (e.g. 'activities')
  const type = await ImageType.findOne({
    where: { Name: category },
  });

  // get all images matching image type in alphabetical order
  const images = await Image.findAll({
    order: [[sequelize.fn('lower', sequelize.col('FileName')), 'ASC']],
    raw: true,
    where: {
      ImageTypeID: type.ID,
    },
  });

  // for each image...
  for (const image of images) {
    // get the absolute path of the image
    const imagePath = type.Location + '\\' + image.FileName + image.FileType;
    // if image still exists, push the path onto the image path array
    if (fs.existsSync(imagePath))
      imageArray.push([imagePath, image.ID, image.FileName]);
    // if image doesn't exist, destroy its copies and the image
    else {
      await ImageCopy.destroy({
        where: { ImageID: image.ID },
      });
      await Image.destroy({ where: { ID: image.ID } });
    }
  }

  // return the array of image paths to use as img src ref in front-end
  return imageArray;
};

// Called when app loads (should run before getImageCopies())
//    1. Checks for week passing
//    2. Deletes all image copies with 'This Week' tag
//    3. Changes image copies with 'Next Week' tag to 'This Week' tag
const updateCalendar = () => {};

// Called when an image is dragged and dropped onto the screen
// Saves an image copy in the database
const setImageCopy = () => {};

// Called when an image is dragged and dropped onto the delete tab
// Deletes an image copy from the database
const deleteImageCopy = () => {};

// Called when app loads
// Get all image copies sorted by created date
const getImageCopies = () => {};

// Called when folder path is changed for specific image type
// Set customization flag in model
const updateFolderLocation = () => {};

// Initialize image types if they don't exist
const initializeImageTypes = async () => {
  // See if any image types exist
  const imageTypesInitialized = await ImageType.findOne();

  // if no image types exist, initialize them in database
  if (!imageTypesInitialized) {
    await ImageType.bulkCreate([
      {
        Name: 'people',
        Location: process.cwd() + '\\public\\base_images\\people',
      },
      {
        Name: 'transportation',
        Location: process.cwd() + '\\public\\base_images\\transportation',
      },
      {
        Name: 'popular',
        Location: process.cwd() + '\\public\\base_images\\popular',
      },
      {
        Name: 'activities',
        Location: process.cwd() + '\\public\\base_images\\activities',
      },
    ]);
  }

  // find all image types that don't have customized location
  const uncustomizedTypes = await ImageType.findAll({
    where: { IsCustomized: false },
  });

  // update with built-in image location in case executable was moved
  for (const type of uncustomizedTypes)
    await type.update({
      Location: process.cwd() + '\\public\\base_images\\' + type.Name,
    });
};

// Initialize week tags
const initializeWeekTags = async () => {
  // check if any week tags exist
  const weekTagsInitialized = await WeekTag.findOne();

  // if not, initialize them
  if (!weekTagsInitialized) {
    await WeekTag.bulkCreate([
      { Description: 'This Week' },
      { Description: 'Next Week' },
    ]);
  }
};

module.exports = {
  writeImages,
  writeAllImages,
  readImages,
  updateCalendar,
  setImageCopy,
  deleteImageCopy,
  getImageCopies,
  updateFolderLocation,
  initializeImageTypes,
  initializeWeekTags,
};