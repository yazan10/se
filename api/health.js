// YAZ Server - Health Check
const { setCors, handleOptions, jsonResponse } = require('../lib/utils');

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;
  setCors(res);
  jsonResponse(res, 200, {
    success: true,
    service: "YAZ Qualcomm OneclickTool License Server",
    developer: "YAZ",
    instagram: "https://www.instagram.com/yaz.salaqq",
    telegram: "https://t.me/Yazunlo",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    vercel: !!process.env.VERCEL
  });
};
