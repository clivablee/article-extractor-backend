const cheerio = require("cheerio");
const { google } = require("googleapis");
const path = require("node:path");

const extractMetaData = ($) => {
  const titleTag = $("p:contains('Meta Title')").text();
  const descTag = $("p:contains('Meta Description')").text();

  const metaTitle = titleTag ? titleTag.split(/:(.+)/)[1]?.trim() : null;
  const metaDescription = descTag ? descTag.split(/:(.+)/)[1]?.trim() : null;

  return { metaTitle, metaDescription };
};

const validateImageCount = (images) => {
  const issues = [];

  if (images.length < 3) {
    issues.push({
      type: "Error",
      message: "Article has less than 3 images",
    });
  }
  if (images.length > 10) {
    issues.push({
      type: "Error",
      message: "Article has more than 10 images",
    });
  }

  return issues;
};

const validateImageAttributes = ($, images) => {
  const issues = [];

  images.each((index, element) => {
    const src = $(element).attr("src") || "";
    const alt = $(element).attr("alt");

    if (
      !src.includes("googleusercontent.com") &&
      !src.includes("drive.google.com")
    ) {
      issues.push({
        type: "Error",
        message: `Image ${index + 1} is not from Google Drive`,
      });
    }

    if (!alt || alt.trim() === "") {
      issues.push({
        type: "Error",
        message: `Image ${index + 1} has no alt text`,
      });
    }
  });

  return issues;
};

const validateProductLinks = ($, links) => {
  const issues = [];
  const productLinks = []; //links to product pages
  const productLinkPattern = /shop|product|amazon|item|checkout/i;

  links.each((index, element) => {
    const href = $(element).attr("href") || "";
    if (productLinkPattern.test(href)) {
      productLinks.push(href);
    }
  });

  if (productLinks.length < 1) {
    issues.push({
      type: "Error",
      message: "Article has no product links",
    });
  }
  return { issues, productLinks };
};

const validateStructure = ($) => {
  const issues = [];

  if ($("h2").length === 0) {
    issues.push({
      type: "Error",
      message: "Article has no h2 tags",
    });
  }

  return issues;
};

const cleanupHTML = ($) => {
  // Remove meta title and meta description paragraphs for wordpress purposes
  $("p:contains('Meta Title')").remove();
  $("p:contains('Meta Description')").remove();

  // Remove empty paragraphs that have no images
  $("p").each((index, element) => {
    if (
      $(element).text().trim() === "" &&
      $(element).find("img").length === 0
    ) {
      $(element).remove();
    }
  });

  // Remove unnecessary inline styles
  $("*").removeAttr("style");
};

module.exports = {
  exportArticleAsHTML: async (documentId) => {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    const drive = google.drive({ version: "v3", auth });
    const driveResponse = await drive.files.export({
      fileId: documentId,
      mimeType: "text/html",
    });

    return driveResponse.data;
  },

  validateArticle: async (rawHTML) => {
    const $ = cheerio.load(rawHTML);

    // Extract data
    const { metaTitle, metaDescription } = extractMetaData($);
    const articleTitle = $("h1").first().text() || $("p").first().text();

    // Get elements for validation
    const images = $("img");
    const links = $("a");

    // Run all validations
    const imageCountIssues = validateImageCount(images);
    const imageAttrIssues = validateImageAttributes($, images);

    const { issues: productLinkIssues, productLinks } = validateProductLinks(
      $,
      links
    );
    const structureIssues = validateStructure($);

    const issues = [
      ...imageCountIssues,
      ...imageAttrIssues,
      ...productLinkIssues,
      ...structureIssues,
    ];

    // the unnecessary parts
    cleanupHTML($);
    const articleHTML = $("body").html();

    return {
      meta: {
        title: metaTitle,
        description: metaDescription,
      },
      article: {
        title: articleTitle,
        html: articleHTML,
      },
      articleIssues: {
        totalIssueCount: issues.length,
        issues,
      },
      articleStats: {
        imageCount: images.length,
        linkCount: links.length,
        productCount: productLinks.length,
      },
    };
  },
};
