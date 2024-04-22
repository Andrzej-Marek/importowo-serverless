const sharp = require("sharp");
const main = async () => {
  console.log("START");
  const meta = sharp("input.jpg").metadata();
  return { body: "Hello, World!", meta };
};

module.exports.main = main;
