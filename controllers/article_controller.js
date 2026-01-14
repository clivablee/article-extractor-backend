const ArticleService = require("../services/article_service");

class ArticleController {
  getArticle = async (req, res) => {
    const documentId = req.params.documentId;
    try {
      if (!documentId) {
        return res.status(400).json({ error: "No document id provided" });
      }

      const rawHTML = await ArticleService.exportArticleAsHTML(documentId);
      const response = await ArticleService.validateArticle(rawHTML);

      return res.status(200).json({
        status: "OK",
        data: response,
      });
    } catch (error) {
      return res.status(500).json({
        message: `Error occurred ${error.message}`,
      });
    }
  };
}

module.exports = { ArticleController };
