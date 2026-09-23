const functions = require("firebase-functions");
const https     = require("https");

exports.sendSMSAlert = functions.https.onCall(async (data, context) => {
  const { phone, message } = data;

  // 🔑 PASTE YOUR FAST2SMS API KEY HERE
  const API_KEY = "MrDsWxlvS3pB8bLfya9GcVZzeJFgTCnXI5YH17jwOEitNK42RmpAZ6FazQ8HPB7lbWfsyDG9dOYx3Nq2";

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      route:    "q",
      message:  message,
      language: "english",
      flash:    0,
      numbers:  phone,
    });

    const options = {
      hostname: "www.fast2sms.com",
      path:     "/dev/bulkV2",
      method:   "POST",
      headers: {
        "authorization": "MrDsWxlvS3pB8bLfya9GcVZzeJFgTCnXI5YH17jwOEitNK42RmpAZ6FazQ8HPB7lbWfsyDG9dOYx3Nq2",
        "Content-Type":  "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        try {
          const result = JSON.parse(body);
          if (result.return === true) {
            resolve({ success: true });
          } else {
            reject(new functions.https.HttpsError("internal", result.message || "SMS failed"));
          }
        } catch (e) {
          reject(new functions.https.HttpsError("internal", "Parse error"));
        }
      });
    });

    req.on("error", (e) => {
      reject(new functions.https.HttpsError("internal", e.message));
    });

    req.write(postData);
    req.end();
  });
});