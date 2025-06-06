const express = require('express');
const dotenv = require('dotenv');
const sequelize = require('./config/database');
const requestRoutes = require('./src/routes/requestRoutes');
const db = require('./src/models');
const User = db.User;
const Course = db.Course;
const FeeReceipt = db.FeeReceipt;
const Request = db.Request;
const Notification = db.Notification;
const Department = db.Department;
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { signToken } = require('./src/utils/jwt');
const authenticate = require('./src/middleware/authMiddleware');
const courseRoutes = require('./src/routes/courseRoutes');
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const electivesRoutes = require('./routes/electives');

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  next();
});

// Routes
app.use('/api/requests', requestRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/electives', electivesRoutes);

// Set up multer storage
const upload = multer({ 
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: async function (req, file, cb) {
      try {
        // Ensure user is authenticated and req.user is populated
        if (!req.user || !req.user.id) {
          console.error('DEBUG: User not authenticated or ID missing in req.user for fee slip upload');
          return cb(new Error('User not authenticated'));
        }
        console.log('DEBUG: User ID for fee slip filename:', req.user.id);
        const user = await User.findByPk(req.user.id);
        if (!user) {
          console.error('DEBUG: User not found in database for fee slip upload, ID:', req.user.id);
          return cb(new Error('User not found'));
        }
        const rollNo = user.rollNo;
        cb(null, `${rollNo}.pdf`);
      } catch (err) {
        cb(err);
      }
    }
  }),
  limits: {
    fileSize: 1 * 1024 * 1024 // 1MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF files are allowed.'));
    }
  }
});

// FeeReceipts endpoints
app.get('/api/feereceipts', async (req, res) => {
  try {
    const { userId } = req.query;
    const whereClause = userId ? { userId } : {};
    const receipts = await FeeReceipt.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['name', 'rollNo', 'department']
      }]
    });
    res.json(receipts);
  } catch (err) {
    console.error('Error fetching fee receipts:', err);
    res.status(500).json({ error: 'Failed to fetch fee receipts', details: err.message });
  }
});

// Add file upload endpoint for fee receipts
app.post('/api/feereceipts/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { userId, semester, paymentMode, transactionNumber, bankName } = req.body;
    const user = await User.findByPk(Number(userId));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const departmentId = user.departmentId;
    if (!departmentId) {
      return res.status(404).json({ error: 'Department ID not found for user' });
    }

    const receipt = await FeeReceipt.create({
      userId,
      file: req.file ? req.file.path : '',
      status: 'pending',
      semester: null,
      paymentMode,
      transactionNumber,
      bankName
    });

    const request = await Request.create({
      userId,
      type: 'feeslip',
      status: 'pending',
      departmentId: departmentId,
      details: {
        studentName: user.name,
        rollNo: user.rollNo,
        filename: req.file.originalname,
        semester,
        paymentMode,
        transactionNumber: paymentMode === 'Online' || paymentMode === 'Offline (Bank to Bank)' ? transactionNumber : undefined,
        bankName: paymentMode === 'Online' || paymentMode === 'Offline (Bank to Bank)' ? bankName : undefined,
        feeReceiptId: receipt.id
      }
    });

    res.json(receipt);
  } catch (err) {
    console.error('Error in /api/feereceipts/upload:', err);
    
    if (err.name === 'MulterError') {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size should be less than 1MB' });
      }
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ 
      error: 'Failed to upload fee receipt', 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Serve fee receipt PDF by id
app.get('/api/feereceipts/:id/file', async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await FeeReceipt.findByPk(id);
    if (!receipt || !receipt.file) {
      return res.status(404).json({ error: 'Fee receipt not found' });
    }
    const filePath = path.resolve(receipt.file);
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: 'Failed to serve fee receipt file' });
  }
});

// Sync Sequelize models and start the server
sequelize.authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
    return sequelize.sync();
  })
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

// Global error handler for JSON API responses
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
}); 