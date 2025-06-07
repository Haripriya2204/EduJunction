const db = require("../models");
const User = db.User;
const Request = db.Request;
const Department = db.Department;
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const FeeReceipt = db.FeeReceipt;
const Notification = db.Notification;

const requestController = {
  // Get all requests for a department admin
  async getDepartmentRequests(req, res) {
    try {
      const adminId = req.user.id;

      // Get admin's department
      // Note: department is always a code (CSE, CSM, CSC, Aeronautical)
      const admin = await User.findByPk(adminId);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const requests = await Request.findAll({
        where: {
          departmentId: admin.departmentId,
        },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "rollNo", "email", "department"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      res.json(requests);
    } catch (error) {
      console.error("Error fetching department requests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Update request status
  async updateRequestStatus(req, res) {
    try {
      const { requestId } = req.params;
      const { status } = req.body;
      const adminId = req.user.id;

      // Get admin's department
      // Note: department is always a code (CSE, CSM, CSC, Aeronautical)
      const admin = await User.findByPk(adminId);
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Find request and verify it belongs to admin's department
      const request = await Request.findOne({
        where: {
          id: requestId,
          departmentId: admin.departmentId,
        },
      });

      if (!request) {
        return res
          .status(404)
          .json({ error: "Request not found or unauthorized" });
      }

      // Update request status
      const updateData = { status };
      if (status === "on_hold") {
        updateData.holdStartDate = new Date();
      }

      await request.update(updateData);

      // If this is a feeslip request, update the corresponding user's fields
      if (request.type === "feeslip") {
        let feeReceipt;
        // Try to find the associated fee receipt using feeReceiptId from request.details
        if (request.details && request.details.feeReceiptId) {
          feeReceipt = await FeeReceipt.findByPk(request.details.feeReceiptId);
        }

        // Fallback: If no specific feeReceiptId or feeReceipt not found, try to find the latest pending one for the user
        if (!feeReceipt) {
          feeReceipt = await FeeReceipt.findOne({
            where: {
              userId: request.userId,
              status: "pending", // We are looking for a pending one to link
            },
            order: [["createdAt", "DESC"]],
          });
        }

        if (feeReceipt) {
          // Update the status of the fee_receipts table record as well
          await feeReceipt.update({ status: status });

          // Update user's fee-related fields in the users table
          const userToUpdate = await User.findByPk(request.userId);
          if (userToUpdate) {
            await userToUpdate.update({
              fee_status: status,
              approved_semester: feeReceipt.semester || null,
              payment_mode: feeReceipt.payment_mode || null,
              transaction_number: feeReceipt.transaction_number || null,
              bank_name: feeReceipt.bank_name || null,
              fee_receipt_url: feeReceipt.file_url || null,
            });
            // Also update the local storage user object if it's the current user
            // (This part is handled on the frontend via re-fetching current user or direct local storage update on successful request from the current user.)
          }
        }
      }

      res.json(request);
    } catch (error) {
      console.error("Error updating request status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Create new request (for students)
  async createRequest(req, res) {
    try {
      const { type, details } = req.body;
      const userId = req.user.id;

      // Get student's information
      const student = await User.findByPk(userId);
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      let newDetails = details;
      // If this is a feeslip request, attach the latest pending feereceipt ID
      if (type === "feeslip") {
        const latestFeeReceipt = await FeeReceipt.findOne({
          where: { userId, status: "pending" },
          order: [["createdAt", "DESC"]],
        });
        if (latestFeeReceipt) {
          newDetails = {
            ...details,
            feeReceiptId: latestFeeReceipt.id,
            semester: latestFeeReceipt.semester,
          };
        }
      }

      const request = await Request.create({
        userId,
        type,
        details: newDetails,
        departmentId: student.departmentId,
        status: "pending",
      });

      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating request:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Get all requests for the logged-in student
  async getMyRequests(req, res) {
    try {
      const userId = req.user.id;
      const requests = await Request.findAll({
        where: { userId },
        order: [["createdAt", "DESC"]],
      });
      res.json(requests);
    } catch (error) {
      console.error("Error fetching student requests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Get all requests with optional filters
  async getAllRequests(req, res) {
    try {
      const { userId, status, type } = req.query;
      const where = {};
      if (userId) where.userId = userId;
      if (status) where.status = status;
      if (type) where.type = type;
      const requests = await Request.findAll({
        where,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["name", "rollNo", "department"],
          },
          // Temporarily remove Department include to debug 500 error
          // {
          //   model: Department,
          //   as: "department",
          //   attributes: ["name"],
          // },
        ],
        order: [["createdAt", "DESC"]],
      });
      res.json(requests);
    } catch (err) {
      console.error("Error fetching requests:", err);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  },

  // Get a single request by ID
  async getRequestById(req, res) {
    try {
      const request = await Request.findByPk(req.params.id, {
        include: [
          {
            model: User,
            as: "user",
            attributes: ["name", "rollNo", "department"],
          },
          {
            model: Department,
            as: "department",
            attributes: ["name"],
          },
        ],
      });
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      res.json(request);
    } catch (err) {
      console.error("Error fetching request:", err);
      res.status(500).json({ error: "Failed to fetch request" });
    }
  },

  // Update a request
  async updateRequest(req, res) {
    try {
      const request = await Request.findByPk(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      const oldStatus = request.status;
      await request.update(req.body);
      // Create notification if status changed
      if (req.body.status && req.body.status !== oldStatus) {
        // Fetch department name for notification
        let departmentName = "";
        if (request.departmentId) {
          const dept = await Department.findByPk(request.departmentId);
          departmentName = dept ? dept.name : "";
        }
        await Notification.create({
          userId: request.userId,
          departmentId: request.departmentId,
          type: "request_updated",
          title: `Request ${req.body.status}`,
          description: `Your ${request.type} request has been ${req.body.status}.`,
          department: departmentName,
          isRead: false,
        });
      }
      // If this is a feeslip request and status is approved, update the corresponding feereceipt
      if (request.type === "feeslip" && req.body.status === "approved") {
        // Use feeReceiptId from request.details if available
        const feeReceiptId = request.details && request.details.feeReceiptId;
        if (feeReceiptId) {
          const feeReceipt = await FeeReceipt.findByPk(feeReceiptId);
          if (feeReceipt) {
            const semester = request.details.semester || null;
            await feeReceipt.update({ status: "approved", semester });
          }
        } else {
          // Fallback: Find the latest pending feereceipt for this user (legacy)
          const feeReceipt = await FeeReceipt.findOne({
            where: {
              userId: request.userId,
              status: "pending",
            },
            order: [["createdAt", "DESC"]],
          });
          if (feeReceipt) {
            const semester = request.details.semester || null;
            await feeReceipt.update({ status: "approved", semester });
          }
        }
      }
      res.json(request);
    } catch (err) {
      console.error("Error updating request:", err);
      res.status(500).json({ error: "Failed to update request" });
    }
  },

  // Delete a request
  async deleteRequest(req, res) {
    try {
      const request = await Request.findByPk(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      await request.destroy();
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting request:", err);
      res.status(500).json({ error: "Failed to delete request" });
    }
  },
};

module.exports = requestController;
