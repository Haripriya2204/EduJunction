const path = require('path');
const xlsx = require('xlsx');
const { Course, StudentElective } = require('../src/models');
const sequelize = require('../config/database'); // Import sequelize instance
const dotenv = require('dotenv');
dotenv.config();
// console.log('DB_USER:', process.env.DB_USER); // Sensitive
// console.log('DB_PASSWORD:', process.env.DB_PASSWORD); // Sensitive
// console.log('DB_NAME:', process.env.DB_NAME);
// console.log('DB_HOST:', process.env.DB_HOST);

const excelPath = path.join(__dirname, '../excel_data/Computer Science and Engineering dept_ach.xlsx');
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

// Ensure all department assignments use codes
const departmentCodeMap = {
  'Computer Science and Engineering': 'CSE',
  'Computer Science and Engineering - Artificial Intelligence and Machine Learning': 'CSM',
  'Computer Science and Engineering - Cyber Security': 'CSC',
  'Aeronautical': 'Aeronautical',
  'CSE': 'CSE',
  'CSM': 'CSM',
  'CSC': 'CSC',
};

// Add a mapping for open elective offering departments to codes
const openElectiveDeptMap = {
  'Computer Science and Engineering': 'CSE',
  'Computer Science and Engineering - Artificial Intelligence and Machine Learning': 'CSM',
  'Computer Science and Engineering - Cyber Security': 'CSC',
  'Aeronautical Engineering': 'Aeronautical',
  'CSE': 'CSE',
  'CSM': 'CSM',
  'CSC': 'CSC',
  'Aeronautical': 'Aeronautical',
};

async function importSemesters() {
  for (const { sheet, semester } of semSheetMap) {
    const sheetObj = workbook.Sheets[sheet];
    if (!sheetObj) continue;
    const rows = xlsx.utils.sheet_to_json(sheetObj);
    for (const row of rows) {
      const code = row['Course Code'] || row['Code'] || '';
      const name = row['Course Title'] || row['Course'] || '';
      let credits = row['Credits'];
      if (credits === '-' || credits === undefined || credits === null || credits === '') credits = 0;
      credits = parseFloat(credits) || 0;
      // Skip Open Elective rows in semester sheets
      if ((code && code.toString().toLowerCase().includes('open elective')) || (name && name.toString().includes('open elective'))) continue;
      if (!code && !name) continue;
      // Always set department to 'CSE' for CSE import
      const department = 'CSE';
      if (!department) {
        console.warn('Skipping row with missing department:', row);
        continue;
      }
      try {
        await Course.create({
          code,
          name,
          credits,
          department,
          semester,
          isElective: false,
          category: '',
          offeringDepartment: '',
          peGroupId: null,
          oeGroupId: null
        });
        if (department === 'CSE' && semester === '1') {
          console.log(`[MANDATORY] Inserted CSE Sem1: ${code} - ${name}`);
        }
      } catch (err) {
        console.error('Error inserting course:', row, err);
      }
    }
  }
}

async function importProfessionalElectives() {
  console.log('Starting importProfessionalElectives');
  const sheet = workbook.Sheets['Sheet9'];
  if (!sheet) {
    console.log('Sheet9 (Professional Electives) not found!');
    return;
  }

  const rows = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: ''
  });

  // Define the blocks: [startRow, [group, codeCol, nameCol], ...]
  const blocks = [
    { start: 1, groups: [ // PE-I and PE-II
      { group: 'PE-I', codeCol: 0, nameCol: 1 },
      { group: 'PE-II', codeCol: 4, nameCol: 5 }
    ], count: 8 },
    { start: 9, groups: [ // PE-III and PE-IV
      { group: 'PE-III', codeCol: 0, nameCol: 1 },
      { group: 'PE-IV', codeCol: 4, nameCol: 5 }
    ], count: 8 },
    { start: 17, groups: [ // PE-V and PE-VI
      { group: 'PE-V', codeCol: 0, nameCol: 1 },
      { group: 'PE-VI', codeCol: 4, nameCol: 5 }
    ], count: 8 },
    { start: 25, groups: [ // PE-III LAB
      { group: 'PE-III LAB', codeCol: 0, nameCol: 1 }
    ], count: 6 }
  ];

  const groupOrder = [
    'PE-I', 'PE-II', 'PE-III', 'PE-IV', 'PE-V', 'PE-VI', 'PE-III LAB'
  ];

  for (const block of blocks) {
    for (const { group, codeCol, nameCol } of block.groups) {
      const peGroupId = groupOrder.indexOf(group) + 1;
      for (let i = 0; i < block.count; i++) {
        const rowIdx = block.start + i;
        const row = rows[rowIdx];
        if (!row) continue;
        const code = String(row[codeCol] || '').trim();
        const name = String(row[nameCol] || '').trim();
        if (!code && !name) continue;
        // Skip header rows
        if (code.toLowerCase().includes('course code') ||
            groupOrder.some(g => code.toUpperCase().includes(g.replace('-', '')))) {
          continue;
        }
        if (code && name) {
          try {
            // Always set department to 'CSE' for PE import
            const department = 'CSE';
            await Course.create({
              code,
              name: name.trim(),
              credits: parseFloat(row['Credits']) || 3,
              department,
              semester: String(row['Semester']) || '6',
              isElective: true,
              category: 'PE',
              offeringDepartment: '',
              peGroupId,
              oeGroupId: null
            });
            console.log(`[PE] Inserted (${group}): ${code} - ${name.trim()}`);
          } catch (err) {
            console.error(`Error inserting ${group}:`, code, name, err);
          }
        }
      }
    }
  }
  console.log('Finished processing Professional Electives');
}

async function importOpenElectives() {
  const sheet = workbook.Sheets['Sheet10'];
  if (!sheet) return;
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  let groupId = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Skip the first column (empty)
    if (row[1] && row[1].toString().toUpperCase().includes('OPEN ELECTIVE')) {
      groupId++;
      i++; // Skip the "OPEN ELECTIVE-X" header row itself
      continue;
    }
    const code = String(row[1] || '').trim();
    const name = String(row[2] || '').trim();
    const offeringDepartmentFullName = String(row[3] || '').trim();
    // Map offering department full name to code, default to original if not found
    const offeringDepartment = openElectiveDeptMap[offeringDepartmentFullName] || offeringDepartmentFullName;

    // Ensure semester defaults correctly if not present or empty
    const semesterValue = row['Semester']; // Excel column is usually named 'Semester'
    const semester = semesterValue ? String(semesterValue).trim() : '6'; // Default to '6'

    // Ensure credits default correctly if not present or empty
    let creditsValue = row['Credits']; // Excel column is usually named 'Credits'
    if (creditsValue === '-' || creditsValue === undefined || creditsValue === null || String(creditsValue).trim() === '') {
      creditsValue = 3; // Default to 3 if empty, undefined, or '-'
    }
    const credits = parseFloat(creditsValue) || 3; // Ensure it's a number, default to 3 if parsing fails

    if (!code && !name) continue;
    try {
      // Always set department to 'CSE' for OE import
      const department = 'CSE';
      await Course.create({
        code,
        name,
        credits, // Use parsed and defaulted credits
        department,
        semester, // Use parsed and defaulted semester
        isElective: true,
        category: 'OE',
        offeringDepartment,
        peGroupId: null,
        oeGroupId: groupId > 0 ? groupId : null // This should be fine if groupId starts incrementing correctly
      });
      console.log(`[OE] Inserted (Group ${groupId}): ${code} - ${name} (Offered by: ${offeringDepartment})`);
    } catch (err) {
      console.error('Error inserting OE:', row, err);
    }
  }
  console.log('Finished processing Open Electives');
}

// Add Professional Elective placeholders to mandatory courses
async function addProfessionalElectivePlaceholders() {
  console.log('Starting addProfessionalElectivePlaceholders');
  
  // Define PE placeholders for different semesters
  const pePlaceholders = [
    // Semester 5
    { semester: '5', code: 'PE501', name: 'Professional Elective - I', credits: 3, groupId: 1 },
    { semester: '5', code: 'PE502', name: 'Professional Elective - II', credits: 3, groupId: 2 },
    
    // Semester 6
    { semester: '6', code: 'PE601', name: 'Professional Elective - III', credits: 3, groupId: 3 },
    { semester: '6', code: 'PE602', name: 'Professional Elective - IV', credits: 3, groupId: 4 },
    
    // Semester 7
    { semester: '7', code: 'PE701', name: 'Professional Elective - V', credits: 3, groupId: 5 },
    { semester: '7', code: 'PE702', name: 'Professional Elective - VI', credits: 3, groupId: 6 },
    { semester: '7', code: 'PE703', name: 'Professional Elective - III LAB', credits: 1.5, groupId: 7 },
    
    // Semester 8 - Open Electives
    { semester: '8', code: 'OE801', name: 'Open Elective - I', credits: 3, groupId: 101 },
    { semester: '8', code: 'OE802', name: 'Open Elective - II', credits: 3, groupId: 102 },
  ];
  
  for (const placeholder of pePlaceholders) {
    try {
      await Course.create({
        code: placeholder.code,
        name: placeholder.name,
        credits: placeholder.credits,
        department: 'Computer Science and Engineering',
        semester: placeholder.semester,
        isElective: false, // These are mandatory placeholders
        category: '',
        offeringDepartment: '',
        peGroupId: null,
        oeGroupId: null
      });
      console.log(`[PLACEHOLDER] Inserted: ${placeholder.code} - ${placeholder.name} (Semester ${placeholder.semester})`);
    } catch (err) {
      console.error('Error inserting placeholder:', placeholder, err);
    }
  }
  
  console.log('Finished adding Professional Elective placeholders');
}

async function main() {
  const queryInterface = sequelize.getQueryInterface(); // Get queryInterface here
  console.log('main started');
  try {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', null, { raw: true });
    console.log('--- Disabled foreign key checks ---');

    // Drop student_electives table if it exists
    try {
      await queryInterface.dropTable('student_electives');
      console.log('--- Dropped student_electives table ---');
    } catch (dropError) {
      // Log error if dropTable fails (e.g., table doesn't exist), but continue
      console.warn('Warning: Failed to drop student_electives table (it might not exist yet):', dropError.message);
    }

    // Then, delete all courses
    await Course.destroy({ truncate: true, cascade: false }); // Should work now
    console.log('--- Cleared courses table ---');

    // Re-enable foreign key checks BEFORE migrations/seeding if they depend on them
    // However, if migrations create tables with FKs, it's better to keep them off until after all data import
    // For now, let's re-enable after course import

    await importSemesters();
    console.log('--- Finished inserting semester subjects ---');
    await importProfessionalElectives();
    console.log('--- Finished inserting Professional Electives ---');
    await importOpenElectives();
    console.log('--- Finished inserting Open Electives ---');
    await addProfessionalElectivePlaceholders();
    console.log('--- Finished adding Professional Elective placeholders ---');
    
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });
    console.log('--- Re-enabled foreign key checks (after data import) ---');
    console.log('All courses imported successfully.');

  } catch (error) {
    console.error('Error importing courses:', error);
    // Ensure foreign key checks are re-enabled in case of error
    try {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });
      console.log('--- Foreign key checks re-enabled after error ---');
    } catch (fkError) {
      console.error('Failed to re-enable foreign key checks after error:', fkError);
    }
  }
  console.log('main finished');
}

main(); 