const fs = require("fs");
const csv = require("csv-parse");
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://nihdnnaixxtndvddgoel.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5paGRubmFpeHh0bmR2ZGRnb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxODEyNjUsImV4cCI6MjA2NDc1NzI2NX0.R10U6v7FdPU8wNbstBvClK-EAYhZm7B2oeRCvbRREEs";
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedStudents() {
  try {
    // First, check if the table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from("students")
      .select("count")
      .limit(1);

    if (tableError) {
      console.error("Error checking table:", tableError);
      return;
    }

    // Read the CSV file
    const fileContent = fs.readFileSync("./users.csv", "utf-8");

    // Parse CSV
    const parser = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    let successCount = 0;
    let errorCount = 0;

    // Process each record
    for await (const record of parser) {
      try {
        const { data, error } = await supabase
          .from("students")
          .insert([
            {
              roll_number: record["Roll Number"],
              name: record["Student Name"],
              branch: record["BRANCH"],
              year: record["YEAR"],
              semester: record["SEMESTER"],
              email: record["MAIL ID"],
            },
          ])
          .select();

        if (error) {
          console.error(
            "Error inserting record for",
            record["Roll Number"],
            ":",
            error.message
          );
          errorCount++;
        } else {
          console.log(
            "Successfully inserted record for",
            record["Roll Number"]
          );
          successCount++;
        }
      } catch (err) {
        console.error(
          "Exception while inserting record for",
          record["Roll Number"],
          ":",
          err.message
        );
        errorCount++;
      }
    }

    console.log("\nSeeding completed:");
    console.log(`Successfully inserted: ${successCount} records`);
    console.log(`Failed to insert: ${errorCount} records`);
    process.exit(0);
  } catch (error) {
    console.error("Error in seedStudents:", error);
    process.exit(1);
  }
}

// Run the seeding function
seedStudents();
