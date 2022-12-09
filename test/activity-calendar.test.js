// Our current sequelize module uses NODE_ENV, so we need to set it before loading it.
process.env.NODE_ENV = "test";

const { assert } = require("chai");
const node_assert = require("node:assert");
const { createFsFromVolume, Volume } = require("memfs");

const { sequelize } = require("../src/sequelize");
const { ActivityCalendar } = require("../src/activity-calendar");

describe("ActivityCalendar", async function () {
  // We create a new ActivityCalendar with fresh in-memory fs for each test.
  const vol = new Volume();

  let activityCalendar = null,
    popularCategory = null;

  beforeEach(async function () {
    vol.fromJSON({ "/images/1.jpg": "123", "/images/2.jpg": "456" });

    await sequelize.sync();

    activityCalendar = new ActivityCalendar(createFsFromVolume(vol));

    popularCategory = await sequelize.models.category.create({
      name: "Popular",
    });
  });

  afterEach(async function () {
    // Remove all changes made to our fake fs during the test.
    vol.reset();

    await sequelize.drop();
  });

  describe("settings", async function () {
    it("is initialized with a default", async function () {
      const defaultHoldValue = await activityCalendar.getSettings();
      assert.strictEqual(defaultHoldValue, 300);
    });

    it("set properly updates", async function () {
      await activityCalendar.setSettings(500);
      assert.strictEqual(await activityCalendar.getSettings(), 500);

      await activityCalendar.setSettings(700);
      assert.strictEqual(await activityCalendar.getSettings(), 700);
    });
  });

  describe("getSymbols()", async function () {
    it("returns nothing if there are no symbols", async function () {
      const symbols = await activityCalendar.getSymbols();
      assert.strictEqual(symbols.length, 0);
    });

    it("returns created symbols", async function () {
      const symbol = await activityCalendar.createSymbol(
        "/images/1.jpg",
        "foo",
        "activities",
        "10px",
        "5px",
        0,
        popularCategory.id
      );

      const symbols = await activityCalendar.getSymbols();
      assert.strictEqual(symbols.length, 1);
      assert.deepInclude(symbols[0], symbol);
      assert.strictEqual(symbols[0].category.name, "Popular");
    });
  });

  describe("createSymbol()", async function () {
    it("create is successful", async function () {
      const createSymbol = async (name) => {
        return activityCalendar.createSymbol(
          "/images/1.jpg",
          name,
          "activities",
          "10px",
          "5px",
          0,
          popularCategory.id
        );
      };

      const [symbol1, symbol2] = await Promise.all([
        createSymbol("activity1"),
        createSymbol("activity2"),
      ]);

      // Verify the image path was actually copied rather than using the same image path.
      assert.notStrictEqual(symbol1.imageFilePath, "/images/1.jpg");
      assert.notStrictEqual(symbol1.imageFilePath, symbol2.imageFilePath);

      const validateCommon = (symbol, expectedName) => {
        // Verify that the extension was kept, so that it renders properly when referenced on the frontend.
        assert.match(symbol.imageFilePath, /.jpg/);

        assert.strictEqual(
          vol.readFileSync(symbol.imageFilePath, "utf-8"),
          "123"
        );

        assert.include(symbol, {
          name: expectedName,
          type: "activities",
          posX: "10px",
          posY: "5px",
          zoom: 0,
          categoryId: popularCategory.id,
        });
      };

      validateCommon(symbol1, "activity1");
      validateCommon(symbol2, "activity2");

      // Verify that the symbols didn't overwrite each other.
      const savedSymbols = await activityCalendar.getSymbols();
      assert.strictEqual(savedSymbols.length, 2);
    });

    it("create non-activity with category", async function () {
      const assertSymbolFail = async (type) => {
        await node_assert.rejects(
          async () => {
            return activityCalendar.createSymbol(
              "/images/1.jpg",
              "foo",
              type,
              "10px",
              "5px",
              0,
              popularCategory.id
            );
          },
          {
            name: "SequelizeValidationError",
            message: "Validation error: Only activities can have a category.",
          }
        );
      };

      assertSymbolFail("people");
      assertSymbolFail("transportation");
    });

    it("create without category", async function () {
      const createSymbol = async (name, type) => {
        return activityCalendar.createSymbol(
          "/images/1.jpg",
          name,
          type,
          "10px",
          "5px",
          0
        );
      };

      const person = await createSymbol("symbol1", "people");
      assert.strictEqual(person.category, undefined);

      const activity = await createSymbol("symbol2", "transportation");
      assert.strictEqual(activity.category, undefined);

      await node_assert.rejects(
        async () => {
          return createSymbol("symbol3", "activities");
        },
        {
          name: "SequelizeValidationError",
          message: "Validation error: Activities must have a category.",
        }
      );
    });

    it("create with invalid type", async function () {
      await node_assert.rejects(
        async () => {
          return activityCalendar.createSymbol(
            "/images/1.jpg",
            "foo",
            "Blah",
            "10px",
            "5px",
            0
          );
        },
        {
          name: "SequelizeValidationError",
          message: "Validation error: type must be one of the enum values.",
        }
      );
    });

    it("create with invalid image path", async function () {
      await node_assert.rejects(
        async () => {
          return activityCalendar.createSymbol(
            "/images/invalid.jpg",
            "foo",
            "activities",
            "10px",
            "5px",
            0,
            popularCategory.id
          );
        },
        {
          name: "Error",
          message:
            "ENOENT: no such file or directory, open '/images/invalid.jpg'",
        }
      );
    });
  });

  describe("symbol placements", async function () {
    async function createSymbol(name) {
      return activityCalendar.createSymbol(
        "/images/1.jpg",
        name,
        "activities",
        "10px",
        "5px",
        0,
        popularCategory.id
      );
    }

    it("get with no placements", async function () {
      const now = new Date();
      now.setDate(now.getDate() + 7);
      const placements = await activityCalendar.getSymbolPlacements(
        /*dateStart=*/ new Date(0),
        /*dateEnd=*/ now
      );
      assert.strictEqual(placements.length, 0);
    });

    it("get range", async function () {
      const symbol = await createSymbol("foo");

      const createPlacement = async (date) => {
        return activityCalendar.createSymbolPlacement(
          symbol.id,
          date,
          "10px",
          "20px"
        );
      };

      const start = new Date();

      const placementDate1 = new Date(start);
      placementDate1.setDate(placementDate1.getDate() + 1);
      const placementDate2 = new Date(start);
      placementDate2.setDate(placementDate2.getDate() + 7);
      const placementDate3 = new Date(start);
      placementDate3.setDate(placementDate3.getDate() + 8);

      await Promise.all(
        [placementDate1, placementDate2, placementDate3].map(createPlacement)
      );

      {
        const placements = await activityCalendar.getSymbolPlacements(
          start,
          placementDate2
        );
        assert.strictEqual(placements.length, 2);
        assert.deepInclude(placements[0], {
          date: placementDate1,
        });
        assert.deepInclude(placements[1], {
          date: placementDate2,
        });
      }

      {
        const placements = await activityCalendar.getSymbolPlacements(
          start,
          placementDate3
        );
        assert.strictEqual(placements.length, 3);
      }
    });

    it("create is succesful", async function () {
      const symbol = await createSymbol("foo");

      const start = new Date();
      const placement = await activityCalendar.createSymbolPlacement(
        symbol.id,
        start,
        "10px",
        "20px"
      );

      const placements = await activityCalendar.getSymbolPlacements(
        /*dateStart=*/ start,
        /*dateEnd=*/ start
      );
      assert.deepInclude(placements[0], placement);
      assert.deepInclude(placements[0], {
        date: start,
        posX: "10px",
        posY: "20px",
      });

      const laterStart = new Date(start);
      laterStart.setDate(laterStart.getDate() + 1);
      const laterEnd = new Date(laterStart);
      laterEnd.setDate(laterEnd.getDate() + 7);
      const laterPlacements = await activityCalendar.getSymbolPlacements(
        laterStart,
        laterEnd
      );
      assert.strictEqual(laterPlacements.length, 0);
    });

    it("create with invalid args", async function () {
      await node_assert.rejects(
        async () => {
          return activityCalendar.createSymbolPlacement(
            -1,
            new Date(),
            "10px",
            "20px"
          );
        },
        {
          name: "SequelizeForeignKeyConstraintError",
          message: "SQLITE_CONSTRAINT: FOREIGN KEY constraint failed",
        }
      );
    });

    it("update existing", async function () {
      const symbol = await createSymbol("foo");

      const start = new Date();
      const placement = await activityCalendar.createSymbolPlacement(
        symbol.id,
        start,
        "10px",
        "20px"
      );

      const updatedDate = new Date(start);
      updatedDate.setDate(updatedDate.getDate() + 1);
      await activityCalendar.updateSymbolPlacement(
        placement.id,
        updatedDate,
        "20px",
        "40px"
      );

      const placements = await activityCalendar.getSymbolPlacements(
        updatedDate,
        updatedDate
      );
      assert.deepInclude(placements[0], {
        date: updatedDate,
        posX: "20px",
        posY: "40px",
      });
    });

    it("update non-existent", async function () {
      await node_assert.rejects(
        async () => {
          return activityCalendar.updateSymbolPlacement(-1, "5px", "10px");
        },
        {
          name: "Error",
          message:
            "Unable to find existing to update symbol placement with id -1.",
        }
      );
    });

    it("delete existing", async function () {
      const symbol = await createSymbol("foo");

      const start = new Date();
      const placement = await activityCalendar.createSymbolPlacement(
        symbol.id,
        start,
        "10px",
        "20px"
      );

      await activityCalendar.deleteSymbolPlacement(
        placement.id,
        "20px",
        "40px"
      );

      const placements = await activityCalendar.getSymbolPlacements(
        start,
        start
      );
      assert.strictEqual(placements.length, 0);
    });

    it("delete non-existent", async function () {
      await node_assert.rejects(
        async () => {
          return activityCalendar.deleteSymbolPlacement(-1, "5px", "10px");
        },
        {
          name: "Error",
          message:
            "Unable to find existing to delete symbol placement with id -1.",
        }
      );
    });
  });

  describe("week templates", async function () {
    const createSymbol = async (name) => {
      return activityCalendar.createSymbol(
        "/images/1.jpg",
        name,
        "activities",
        "25px",
        "25px",
        0,
        popularCategory.id
      );
    };

    it("create is successful", async function () {
      const symbol = await createSymbol("foo");
      const weekTemplate = await activityCalendar.createWeekTemplate(
        "winter week"
      );

      await activityCalendar.addSymbolToWeekTemplate(
        symbol.id,
        "10px",
        "20px",
        weekTemplate.id
      );

      const weekTemplatePlacements =
        await activityCalendar.getSymbolPlacementsForWeekTemplate(
          weekTemplate.id
        );

      const actualSymbolId = weekTemplatePlacements[0].symbolId;
      assert.strictEqual(actualSymbolId, symbol.id);
    });

    it("update is successful", async function () {
      const weekTemplate = await activityCalendar.createWeekTemplate(
        "spring week"
      );
      await activityCalendar.updateWeekTemplate(
        weekTemplate.id,
        "fall week",
        "updated"
      );
      const weekTemplateUpdated = await activityCalendar.getWeekTemplate(
        weekTemplate.id
      );

      const actualName = weekTemplateUpdated.name;
      const actualDescription = weekTemplateUpdated.description;

      assert.strictEqual(actualName, "fall week");
      assert.strictEqual(actualDescription, "updated");
    });

    // TODO add more tests (deleteWeekTemplate, updateSymbolPlacements w/ weekTemplate, etc.)
  });
});
