const { Pennding } = require("../../models/pennding");

module.exports = async function deleteOldDocument(jk) {
//   var dt = new Date(Date.now());
//   dt.setDate(dt.getDate() - 1);
var dt = new Date(Date.now());
dt.setSeconds(dt.getSeconds() - 120);
  const afterDays = dt;
  await Pennding.deleteMany({ 'createdAt': { $lte: afterDays }});

  setTimeout(async function() {
    await deleteOldDocument();
}, 5000);   };


