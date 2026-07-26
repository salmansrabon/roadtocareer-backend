const Student = require("../models/Student");
const Remark = require("../models/Remark");

// Shared by the "add remark" endpoint and studentController.migrateStudent
// (which logs its auto-generated migration note the same way as any other
// remark). Creates the student's single remarks row on their first-ever
// remark, otherwise appends to the existing list.
const appendRemarkEntry = async (studentId, text) => {
  const trimmedText = text.trim();
  const newEntry = { text: trimmedText, date: new Date().toISOString() };

  let remarkRow = await Remark.findOne({ where: { studentId } });
  if (!remarkRow) {
    remarkRow = await Remark.create({ studentId, remark: [newEntry] });
  } else {
    remarkRow.remark = [...remarkRow.remark, newEntry];
    remarkRow.changed("remark", true);
    await remarkRow.save();
  }

  await Student.update({ remark: trimmedText }, { where: { StudentId: studentId } });

  return remarkRow.remark;
};

const addRemark = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Remark text is required" });
    }

    const student = await Student.findOne({ where: { StudentId: studentId } });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const remarks = await appendRemarkEntry(studentId, text);
    res.status(200).json({ remarks });
  } catch (error) {
    console.error("Error adding remark:", error);
    res.status(500).json({ message: "Error adding remark" });
  }
};

const updateRemark = async (req, res) => {
  try {
    const { studentId, index } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Remark text is required" });
    }

    const remarkRow = await Remark.findOne({ where: { studentId } });
    if (!remarkRow) {
      return res.status(404).json({ message: "No remarks found for this student" });
    }

    const list = [...remarkRow.remark];
    const idx = parseInt(index, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= list.length) {
      return res.status(400).json({ message: "Invalid remark index" });
    }

    // Keep the original date — editing text doesn't rewrite when it was said
    list[idx] = { ...list[idx], text: text.trim() };
    remarkRow.remark = list;
    remarkRow.changed("remark", true);
    await remarkRow.save();

    if (idx === list.length - 1) {
      await Student.update({ remark: list[idx].text }, { where: { StudentId: studentId } });
    }

    res.status(200).json({ remarks: remarkRow.remark });
  } catch (error) {
    console.error("Error updating remark:", error);
    res.status(500).json({ message: "Error updating remark" });
  }
};

const deleteRemark = async (req, res) => {
  try {
    const { studentId, index } = req.params;

    const remarkRow = await Remark.findOne({ where: { studentId } });
    if (!remarkRow) {
      return res.status(404).json({ message: "No remarks found for this student" });
    }

    const list = [...remarkRow.remark];
    const idx = parseInt(index, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= list.length) {
      return res.status(400).json({ message: "Invalid remark index" });
    }

    list.splice(idx, 1);
    remarkRow.remark = list;
    remarkRow.changed("remark", true);
    await remarkRow.save();

    const latestText = list.length ? list[list.length - 1].text : "";
    await Student.update({ remark: latestText }, { where: { StudentId: studentId } });

    res.status(200).json({ remarks: remarkRow.remark });
  } catch (error) {
    console.error("Error deleting remark:", error);
    res.status(500).json({ message: "Error deleting remark" });
  }
};

const getRemarks = async (req, res) => {
  try {
    const { studentId } = req.params;
    const remarkRow = await Remark.findOne({ where: { studentId } });
    res.status(200).json({ remarks: remarkRow?.remark || [] });
  } catch (error) {
    console.error("Error fetching remarks:", error);
    res.status(500).json({ message: "Error fetching remarks" });
  }
};

module.exports = {
  addRemark,
  updateRemark,
  deleteRemark,
  getRemarks,
  appendRemarkEntry,
};
