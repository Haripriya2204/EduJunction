const path = require('path');
const xlsx = require('xlsx');
const { Course } = require('./src/models');
const sequelize = require('./config/database');
const dotenv = require('dotenv');
dotenv.config();

const excelPath = path.join(__dirname, 'excel_data/Computer Science and Engineering dept_ach.xlsx');

async function importMandatoryCoursesAllSemesters() {
  console.log('=== IMPORTING MANDATORY COURSES FOR ALL SEMESTERS ===');
  
  try {
    const workbook = xlsx.readFile(excelPath);
    
    const semSheetMap = [
      { sheet: 'Sheet1', semester: '1' },
      { sheet: 'Sheet2', semester: '2' },
      { sheet: 'Sheet3', semester: '3' },
      { sheet: 'Sheet4', semester: '4' },
      { sheet: 'Sheet5', semester: '5' },
      { sheet: 'Sheet6', semester: '6' },
      { sheet: 'Sheet7', semester: '7' },
      { sheet: 'Sheet8', semester: '8' }
    ];

    let totalInserted = 0;

    for (const { sheet, semester } of semSheetMap) {
      console.log(`\n=== Processing Semester ${semester} (${sheet}) ===`);
      
      const sheetObj = workbook.Sheets[sheet];
      if (!sheetObj) {
        console.log(`Sheet ${sheet} not found, skipping...`);
        continue;
      }

      const rows = xlsx.utils.sheet_to_json(sheetObj);
      console.log(`Found ${rows.length} rows in ${sheet}`);

      let semesterInserted = 0;

      for (const row of rows) {
        const code = row['Course Code'] || row['Code'] || '';
        const name = row['Course Title'] || row['Course'] || '';
        let credits = row['Credits'];
        
        // Handle credits
        if (credits === '-' || credits === undefined || credits === null || credits === '') {
          credits = 0;
        }
        credits = parseFloat(credits) || 0;

        // Skip Open Elective rows and empty rows
        if ((code && code.toString().toLowerCase().includes('open elective')) || 
            (name && name.toString().includes('open elective'))) {
          continue;
        }
        
        if (!code && !name) continue;

        // Check if course already exists
        const existingCourse = await Course.findOne({
          where: { code: code.trim() }
        });

        if (existingCourse) {
          // Update existing course to ensure it's in the right semester
          await Course.update({
            name: name.trim(),
            credits,
            department: 'Computer Science and Engineering',
            semester,
            isElective: false,
            category: '',
            offeringDepartment: '',
            peGroupId: null,
            oeGroupId: null
          }, {
            where: { code: code.trim() }
          });
          console.log(`  ✅ Updated: ${code} - ${name} (${credits} credits)`);
        } else {
          // Create new course
          try {
            await Course.create({
              code: code.trim(),
              name: name.trim(),
              credits,
              department: 'Computer Science and Engineering',
              semester,
              isElective: false,
              category: '',
              offeringDepartment: '',
              peGroupId: null,
              oeGroupId: null
            });
            console.log(`  ✅ Inserted: ${code} - ${name} (${credits} credits)`);
            semesterInserted++;
          } catch (err) {
            console.error(`  ❌ Error inserting ${code} - ${name}:`, err.message);
          }
        }
      }

      console.log(`Semester ${semester}: ${semesterInserted} new courses added`);
      totalInserted += semesterInserted;
    }

    console.log(`\n=== MANDATORY COURSES IMPORT COMPLETE ===`);
    console.log(`Total new mandatory courses imported: ${totalInserted}`);
    
    // Verify what was imported
    await verifyImportedMandatoryCourses();
    
  } catch (error) {
    console.error('Error importing mandatory courses:', error);
  }
}

async function verifyImportedMandatoryCourses() {
  console.log('\n=== VERIFICATION: IMPORTED MANDATORY COURSES ===');
  
  const courses = await Course.findAll({
    where: {
      isElective: false,
      department: 'Computer Science and Engineering'
    },
    attributes: ['semester', 'code', 'name', 'credits'],
    order: [['semester', 'ASC'], ['code', 'ASC']]
  });

  const groupedBySemester = {};
  courses.forEach(course => {
    if (!groupedBySemester[course.semester]) {
      groupedBySemester[course.semester] = [];
    }
    groupedBySemester[course.semester].push(course);
  });

  Object.keys(groupedBySemester).sort().forEach(semester => {
    const semesterCourses = groupedBySemester[semester];
    console.log(`\nSemester ${semester} (${semesterCourses.length} courses):`);
    semesterCourses.forEach(course => {
      console.log(`  ${course.code} - ${course.name} (${course.credits} credits)`);
    });
  });

  console.log(`\nTotal mandatory courses across all semesters: ${courses.length}`);
}

async function main() {
  try {
    console.log('Starting mandatory courses import for all semesters...');
    
    // Import mandatory courses from Excel for all semesters
    await importMandatoryCoursesAllSemesters();
    
    console.log('\n🎉 Mandatory courses import completed successfully!');
    
  } catch (error) {
    console.error('Error in main:', error);
  }
  
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { importMandatoryCoursesAllSemesters }; 