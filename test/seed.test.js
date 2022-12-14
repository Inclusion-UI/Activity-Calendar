// Our current sequelize module uses NODE_ENV, so we need to set it before loading it.
process.env.NODE_ENV = "test";

const { assert } = require("chai");
const path = require("path");
const { createFsFromVolume, Volume } = require("memfs");

const { sequelize } = require("../src/sequelize");
const { ActivityCalendar } = require("../src/activity-calendar");
const seed = require("../src/seed");

describe("seed", async function () {
  let activityCalendar = null;

  beforeEach(async function () {
    await sequelize.sync();

    // We create a new ActivityCalendar with fresh in-memory fs for each test.
    const vol = new Volume();

    const seedImagesDir = path.join(__dirname, "..", "src", "seed", "images");
    const activitiesDir = path.join(seedImagesDir, "activities");
    const peopleDir = path.join(seedImagesDir, "people");
    const transportationDir = path.join(seedImagesDir, "transportation");

    volJSON = {};

    volJSON[path.join(activitiesDir, "Museums and Galleries", "Museum.png")] =
      "123";
    volJSON[
      path.join(activitiesDir, "Cafes and Restaurants", "Starbucks.png")
    ] = "456";
    volJSON[path.join(transportationDir, "bus.png")] = "789";

    vol.fromJSON(volJSON);

    // There are no images in people.
    vol.mkdirSync(peopleDir);

    activityCalendar = new ActivityCalendar(createFsFromVolume(vol));
  });

  afterEach(async function () {
    sequelize.drop();
  });

  // For now, we don't need sophisticated tests for seed.
  it("works without fail", async function () {
    await seed(activityCalendar);
    const symbol = (await activityCalendar.getSymbols())[0];
    const start = new Date();
    activityCalendar.createSymbolPlacement(symbol.id, start, "10px", "10px");

    // `seed` should be idempotent.
    await seed(activityCalendar);

    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const placements = await activityCalendar.getSymbolPlacements(start, end);

    // `seed` should not delete any existing entries.
    assert.strictEqual(placements.length, 1);
  });
});
