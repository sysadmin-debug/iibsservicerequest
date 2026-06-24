const nodemailer = require('nodemailer');

const user = 'sysadmin@iibsonline.com';
const pass = process.argv[2]; 

if (!pass) {
  console.log("❌ Please provide your password when running the command!");
  console.log("Example: node test-email.js YourPasswordHere123");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: { user, pass }
});

async function test() {
  console.log(`Attempting to login to Office 365 as ${user}...`);
  try {
    await transporter.verify();
    console.log("✅ SUCCESS! The password works and SMTP is allowed.");
  } catch (err) {
    console.error("❌ FAILED:", err.message);
    if (err.message.includes('535 5.7.3')) {
      console.log("\n--- WHY THIS FAILED ---");
      console.log("Microsoft is blocking the login. This means either:");
      console.log("1. The password is wrong.");
      console.log("2. Your IT Admin needs to check the 'Authenticated SMTP' box for this user.");
      console.log("3. You have 2-Factor Auth enabled and MUST use an App Password.");
    }
  }
}

test();