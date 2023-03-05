const mongoose = require('mongoose');

const nursePropertySaveSchema = new mongoose.Schema(
  {
    // relations
    nurse: {
      type: mongoose.Schema.ObjectId,
      ref: 'Nurse',
      required: [true, 'A property must be liked by a nurse user!'],
    },
    property: {
      type: mongoose.Schema.ObjectId,
      ref: 'Property',
      required: [true, 'A liked property should exists!'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

nursePropertySaveSchema.index({ nurse: 1, property: 1 }, { unique: true });

module.exports = mongoose.model('NursePropertySave', nursePropertySaveSchema);
