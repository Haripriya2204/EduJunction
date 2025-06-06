const path = require('path');
const xlsx = require('xlsx');
const { Course, StudentElective } = require('./src/models');
const sequelize = require('./config/database');
const dotenv = require('dotenv');
const { Op } = require('sequelize');
dotenv.config();

const excelPath = path.join(__dirname, 'excel_data/Computer Science and Engineering dept_ach.xlsx');

async function importRealProfessionalElectives() {
  console.log('=== IMPORTING REAL PROFESSIONAL ELECTIVES FROM EXCEL ===');
  
  try {
    const workbook = xlsx.readFile(excelPath);
    const peSheet = workbook.Sheets['Sheet9']; // Professional Electives
    
    if (!peSheet) {
      console.log('Sheet9 (Professional Electives) not found!');
      return;
    }

    const rows = xlsx.utils.sheet_to_json(peSheet, {
      header: 1,
      raw: false,
      defval: ''
    });

    console.log(`Found ${rows.length} rows in Professional Electives sheet`);

    // Define the blocks based on Excel structure
    const blocks = [
      { 
        start: 1, 
        groups: [
          { group: 'PE-I', codeCol: 0, nameCol: 1, semester: '5', peGroupId: 1 },
          { group: 'PE-II', codeCol: 4, nameCol: 5, semester: '5', peGroupId: 2 }
        ], 
        count: 8 
      },
      { 
        start: 9, 
        groups: [
          { group: 'PE-III', codeCol: 0, nameCol: 1, semester: '6', peGroupId: 3, credits: 3 }
        ], 
        count: 8 
      },
      {
        start: 25,
        groups: [
          { group: 'PE-III LAB', codeCol: 0, nameCol: 1, semester: '6', peGroupId: 4, credits: 1.5 }
        ],
        count: 4 // Only 4 lab courses
      }
    ];

    let totalInserted = 0;

    for (const block of blocks) {
      console.log(`\nProcessing block starting at row ${block.start}:`);
      
      for (const { group, codeCol, nameCol, semester, peGroupId } of block.groups) {
        console.log(`  Processing ${group} (Group ${peGroupId}, Semester ${semester}):`);
        
        for (let i = 0; i < block.count; i++) {
          const rowIdx = block.start + i;
          const row = rows[rowIdx];
          
          if (!row) continue;
          
          const code = String(row[codeCol] || '').trim();
          const name = String(row[nameCol] || '').trim();
          
          if (!code && !name) continue;
          
          // Skip header rows
          if (code.toLowerCase().includes('course code') ||
              name.toLowerCase().includes('course title') ||
              code.toUpperCase().includes('PE-') ||
              name.toUpperCase().includes('PROFESSIONAL ELECTIVE')) {
            continue;
          }
          
          if (code && name) {
            try {
              await Course.create({
                code: code.trim(),
                name: name.trim(),
                credits: group.credits || 3, // Use credits from group definition or default to 3
                department: 'Computer Science and Engineering',
                semester: semester,
                isElective: true,
                category: 'PE',
                offeringDepartment: 'Computer Science and Engineering',
                peGroupId: peGroupId,
                oeGroupId: null
              });
              
              console.log(`    ✅ ${code} - ${name}`);
              totalInserted++;
            } catch (err) {
              console.error(`    ❌ Error inserting ${code} - ${name}:`, err.message);
            }
          }
        }
      }
    }

    console.log(`\n=== PROFESSIONAL ELECTIVES IMPORT COMPLETE ===`);
    console.log(`Total Professional Electives imported: ${totalInserted}`);
  } catch (error) {
    console.error('Error importing Professional Electives:', error);
  }
}

async function importOpenElectives() {
  console.log('\n=== IMPORTING OPEN ELECTIVES FROM EXCEL ===');
  
  try {
    const workbook = xlsx.readFile(excelPath);
    const oeSheet = workbook.Sheets['Sheet10']; // Open Electives
    
    if (!oeSheet) {
      console.log('Sheet10 (Open Electives) not found!');
      return;
    }

    const rows = xlsx.utils.sheet_to_json(oeSheet, {
      header: 1,
      raw: false,
      defval: ''
    });

    console.log(`Found ${rows.length} rows in Open Electives sheet`);

    // Define open elective groups
    const oeGroups = [
      { semester: '6', oeGroupId: 1, name: 'Open Elective - I' },
      { semester: '7', oeGroupId: 2, name: 'Open Elective - II' },
      { semester: '8', oeGroupId: 3, name: 'Open Elective - III' }
    ];

    let totalInserted = 0;

    // Start from row 1 to skip header
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;
      
      const code = String(row[0] || '').trim();
      const name = String(row[1] || '').trim();
      const offeringDept = String(row[2] || '').trim();
      const credits = 3; // Default credits for open electives
      
      if (!code || !name || !offeringDept) continue;
      
      // Skip header-like rows
      if (code.toLowerCase().includes('course code') ||
          name.toLowerCase().includes('course title')) {
        continue;
      }

      try {
        // Create this open elective for each semester it's offered
        for (const group of oeGroups) {
          await Course.create({
            code: code,
            name: name,
            credits: credits,
            department: 'Computer Science and Engineering', // student's department
            semester: group.semester,
            isElective: true,
            category: 'OE',
            offeringDepartment: offeringDept,
            peGroupId: null,
            oeGroupId: group.oeGroupId
          });
        }
        
        console.log(`    ✅ ${code} - ${name} (${offeringDept})`);
        totalInserted++;
      } catch (err) {
        if (!err.message.includes('Validation error')) {
          console.error(`    ❌ Error inserting ${code} - ${name}:`, err.message);
        }
      }
    }

    console.log(`\n=== OPEN ELECTIVES IMPORT COMPLETE ===`);
    console.log(`Total Open Electives imported: ${totalInserted}`);
  } catch (error) {
    console.error('Error importing Open Electives:', error);
  }
}

async function verifyImportedElectives() {
  console.log('\n=== VERIFICATION: IMPORTED ELECTIVES ===');
  
  // Verify Professional Electives
  const peElectives = await Course.findAll({
    where: {
      isElective: true,
      category: 'PE',
      department: 'Computer Science and Engineering'
    },
    attributes: ['semester', 'peGroupId', 'code', 'name'],
    order: [['semester', 'ASC'], ['peGroupId', 'ASC'], ['code', 'ASC']]
  });

  const groupedPE = {};
  peElectives.forEach(course => {
    if (!groupedPE[course.semester]) {
      groupedPE[course.semester] = {};
    }
    if (!groupedPE[course.semester][course.peGroupId]) {
      groupedPE[course.semester][course.peGroupId] = [];
    }
    groupedPE[course.semester][course.peGroupId].push(course);
  });

  console.log('\nProfessional Electives:');
  Object.keys(groupedPE).sort().forEach(semester => {
    console.log(`\nSemester ${semester}:`);
    Object.keys(groupedPE[semester]).forEach(groupId => {
      const courses = groupedPE[semester][groupId];
      console.log(`  PE Group ${groupId} (${courses.length} courses):`);
      courses.forEach(course => {
        console.log(`    ${course.code} - ${course.name}`);
      });
    });
  });

  // Verify Open Electives
  const oeElectives = await Course.findAll({
    where: {
      isElective: true,
      category: 'OE',
      department: 'Computer Science and Engineering'
    },
    attributes: ['semester', 'oeGroupId', 'code', 'name', 'offeringDepartment'],
    order: [['semester', 'ASC'], ['oeGroupId', 'ASC'], ['code', 'ASC']]
  });

  const groupedOE = {};
  oeElectives.forEach(course => {
    if (!groupedOE[course.semester]) {
      groupedOE[course.semester] = {};
    }
    if (!groupedOE[course.semester][course.oeGroupId]) {
      groupedOE[course.semester][course.oeGroupId] = [];
    }
    groupedOE[course.semester][course.oeGroupId].push(course);
  });

  console.log('\nOpen Electives:');
  Object.keys(groupedOE).sort().forEach(semester => {
    console.log(`\nSemester ${semester}:`);
    Object.keys(groupedOE[semester]).forEach(groupId => {
      const courses = groupedOE[semester][groupId];
      console.log(`  OE Group ${groupId} (${courses.length} courses):`);
      courses.forEach(course => {
        console.log(`    ${course.code} - ${course.name} (${course.offeringDepartment})`);
      });
    });
  });
}

async function addElectivePlaceholders() {
  console.log('\n=== ADDING ELECTIVE PLACEHOLDERS ===');
  
  // First, remove any existing placeholders
  await Course.destroy({
    where: {
      isElective: false,
      [Op.or]: [
        { category: 'PE' },
        { category: 'OE' }
      ]
    }
  });
  
  const placeholders = [
    // Semester 5
    { semester: '5', code: 'PE501', name: 'Professional Elective - I', credits: 3, category: 'PE' },
    { semester: '5', code: 'PE502', name: 'Professional Elective - II', credits: 3, category: 'PE' },
    
    // Semester 6
    { semester: '6', code: 'PE601', name: 'Professional Elective - III', credits: 3, category: 'PE' },
    { semester: '6', code: 'PE602', name: 'Professional Elective - III LAB', credits: 1.5, category: 'PE' },
    { semester: '6', code: 'OE601', name: 'Open Elective - I', credits: 3, category: 'OE' },
    
    // Semester 7
    { semester: '7', code: 'PE701', name: 'Professional Elective - V', credits: 3, category: 'PE' },
    { semester: '7', code: 'PE702', name: 'Professional Elective - VI', credits: 3, category: 'PE' },
    { semester: '7', code: 'OE701', name: 'Open Elective - II', credits: 3, category: 'OE' },
    
    // Semester 8
    { semester: '8', code: 'OE801', name: 'Open Elective - III', credits: 3, category: 'OE' }
  ];
  
  for (const placeholder of placeholders) {
    try {
      await Course.create({
        code: placeholder.code,
        name: placeholder.name,
        credits: placeholder.credits,
        department: 'Computer Science and Engineering',
        semester: placeholder.semester,
        isElective: false,
        category: placeholder.category,
        offeringDepartment: '',
        peGroupId: null,
        oeGroupId: null
      });
      console.log(`✅ Added placeholder: ${placeholder.code} - ${placeholder.name}`);
    } catch (err) {
      console.error(`❌ Error adding placeholder ${placeholder.code}:`, err.message);
    }
  }
}

// Update the hardcoded PE-III LAB courses
const peIIILabCourses = [
  { code: 'A6AI19', name: 'Deep Learning Lab' },
  { code: 'A6CS32', name: 'Smart Contract Development and Audit Lab' },
  { code: 'A6CY17', name: 'Crime Investigation & Digital Forensics Lab' },
  { code: 'A6CS40', name: 'Image Processing Techniques Lab' }
];

// Add a function to import PE-III LAB courses
async function importPEIIILabCourses() {
  console.log('\n=== IMPORTING PE-III LAB COURSES ===');
  
  // First, remove any existing PE-III LAB courses
  await Course.destroy({
    where: {
      semester: '6',
      isElective: true,
      category: 'PE',
      peGroupId: 4
    }
  });
  
  for (const course of peIIILabCourses) {
    try {
      await Course.create({
        code: course.code,
        name: course.name,
        credits: 1.5,
        department: 'Computer Science and Engineering',
        semester: '6',
        isElective: true,
        category: 'PE',
        offeringDepartment: 'Computer Science and Engineering',
        peGroupId: 4,
        oeGroupId: null
      });
      console.log(`    ✅ ${course.code} - ${course.name}`);
    } catch (err) {
      console.error(`    ❌ Error inserting ${course.code} - ${course.name}:`, err.message);
    }
  }
  console.log('=== PE-III LAB COURSES IMPORT COMPLETE ===');
}

async function main() {
  console.log('Starting electives import...');
  
  // Clear existing electives first
  await Course.destroy({
    where: {
      [Op.and]: [
        { [Op.or]: [{ category: 'PE' }, { category: 'OE' }] },
        { isElective: true }
      ]
    }
  });
  console.log('\nCleared existing electives');

  // Import professional electives
  await importRealProfessionalElectives();
  
  // Import PE-III LAB courses
  await importPEIIILabCourses();
  
  // Import open electives
  await importOpenElectives();
  
  // Add placeholders
  await addElectivePlaceholders();
  
  // Verify imports
  await verifyImportedElectives();
}

if (require.main === module) {
  main();
}

module.exports = { 
  importRealProfessionalElectives,
  importOpenElectives,
  addElectivePlaceholders
}; 