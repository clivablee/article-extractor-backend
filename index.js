require("dotenv").config();
const express = require("express");
const { google } = require("googleapis");
const cheerio = require("cheerio");
const cors = require("cors");
const app = express();
const { ArticleController } = require("./controllers/article_controller");

app.use(cors());
app.use(express.json());
const port = 3000;

const router = express.Router();

app.use(router);

router.get("/articles/:documentId", new ArticleController().getArticle);

console.log("Server is running on port", port);

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
