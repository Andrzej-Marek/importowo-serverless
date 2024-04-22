const MongoClient = require("mongodb").MongoClient;
const sharp = require("sharp");
const fetch = require("node-fetch");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const z = require("zod");

const s3 = new S3Client({
  region: "us-east-1",
  endpoint: "https://importowo-dev.fra1.digitaloceanspaces.com",
  credentials: {
    accessKeyId: "DO00D6UNEBPDXJ94PDNM",
    secretAccessKey: "5h9o7n43H8nGP9QbuLXQT6aiTZ8fVJsxqCxQ1bPt1SM",
  },
  forcePathStyle: true,
});

const optimizeImage = async (buffer, index) => {
  const sizes = [
    { width: 320, height: 240, quality: 1, blur: 20, variant: "placeholder" },
    { width: 800, height: 600, quality: 80, variant: "standard" },
    { width: 1280, height: 960, quality: 90, variant: "hd" },
  ];

  const promise = async (buffer, size, index) => {
    const { width, height, quality, variant } = size;
    const command = sharp(buffer)
      .resize(width, height, { fit: "contain" })
      .webp({ quality: quality });

    if (size.blur) {
      command.blur(size.blur);
    }

    return {
      buffer: await command.toBuffer(),
      variant,
      contentType: "image/webp",
      width,
      height,
      quality,
      index,
    };
  };

  return await Promise.all(
    sizes.map((size) => {
      return promise(buffer, size, index);
    })
  );
};

const uploadBuffer = async (config, key) => {
  const command = new PutObjectCommand({
    Bucket: "tests",
    Key: key,
    ContentType: config.contentType,
    Body: config.buffer,
    ACL: "public-read",
  });

  await s3.send(command);

  return {
    variant: config.variant,
    contentType: "image/webp",
    width: config.width,
    height: config.height,
    key,
    url: `https://importowo-dev.fra1.digitaloceanspaces.com/tests/${key}`,
  };
};

const fetchImage = async (url) => {
  const response = await fetch(url);
  return await response.buffer();
};

const schema = z.object({
  vin: z.string(),
  urls: z.array(z.string().url()),
});

async function main(args) {
  console.log("start!");
  const uri = process.env["DATABASE_URL"];
  console.log("uri", uri);
  let client = new MongoClient(uri);

  try {
    console.log("Connecting to the database");
    await client.connect();
    console.log("Connected to the database");

    await client
      .db("auctions")
      .collection("stocks")
      .findOneAndUpdate(
        { _id: "19c575a8-02a6-49a6-856f-43bf3a91470c" },
        { $set: { test: "DONE" } }
      );

    return { body: "OK" };
  } catch (error) {
    console.error(e);

    return {
      body: {
        error: "There was a problem adding the email address to the database.",
      },
      statusCode: 400,
    };
  } finally {
    await client.close();
  }

  // const meta = await sharp("sammy.png").metadata();

  // const { urls, vin } = schema.parse(args);

  // const files = await Promise.all(urls.map((url) => fetchImage(url)));

  // const data = await Promise.all(
  //   files.map((file, index) => optimizeImage(file, index))
  // );

  // const response = await Promise.all(
  //   data.flat().map((el) => {
  //     return uploadBuffer(el, `${vin}/${el.index}-${el.variant}.webp`);
  //   })
  // );
}

module.exports.main = main;
