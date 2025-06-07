const fs = require("fs");
const csv = require("csv-parse");
const bcrypt = require("bcryptjs");
const sequelize = require("./config/database");
const { User } = require("./models");

async function seedUsers() {
  try {
    // Sync database to ensure tables exist
    await sequelize.sync();

    // Read the CSV file
    const fileContent = fs.readFileSync("./users.csv", "utf-8");

    // Parse CSV
    const parser = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    // Process each record
    for await (const record of parser) {
      // Create user with default password (roll number)
      const hashedPassword = await bcrypt.hash(record["Roll Number"], 10);

      await User.create({
        username: record["Roll Number"],
        name: record["Student Name"],
        password: hashedPassword,
        department: record["BRANCH"],
        role: "student",
        email: record["MAIL ID"],
        rollNo: record["Roll Number"],
        semester: record["SEMESTER"],
      });
    }

    console.log("Users seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding users:", error);
    process.exit(1);
  }
}

// Run the seeding function
seedUsers();
