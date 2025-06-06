// Fetch notifications for the department
// Note: department is always a code (CSE, CSM, CSC, Aeronautical)
const notifications = await db.Notification.findAll({
  where: {
    department: user.department
  }
}); 