const { DateTime } = require('luxon'); 
const mongoose = require('mongoose');

const AuthorSchema = new mongoose.Schema({
    first_name: {
        type: String , 
        required: true , 
        maxlength: 100 , 
    } , 
    family_name: {
        type: String , 
        required: true , 
        maxlength: 100 , 
    } ,
    date_of_birth: {type: Date} , 
    date_of_death: {type: Date} , 
});

// Virtual for author's full name 
AuthorSchema
.virtual('name')
.get(function () {
    return this.family_name + ', ' + this.first_name;
});

// Virtual for author's lifespan
AuthorSchema
.virtual('lifespan')
.get(function () {
    const lifespan = [];
    if (this.date_of_birth) {
        lifespan.push(DateTime.fromJSDate(this.date_of_birth).toLocaleString(DateTime.DATE_MED));
    }
    lifespan.push(' - ');
    if (this.date_of_death) {
        lifespan.push(DateTime.fromJSDate(this.date_of_death).toLocaleString(DateTime.DATE_MED));
    }
    if (lifespan.length > 1) {
        return `( ${lifespan.join('')} )`;
    }
    return '';
});

// Virtual for author's URL
AuthorSchema.virtual('url')
    .get(function () {
        return '/catalog/author/' + this._id;   
    });

AuthorSchema.virtual('date_of_birth_dd_mm_yyyy')
    .get(function () {
        return DateTime.fromJSDate(this.date_of_birth).toISODate();
    })

AuthorSchema.virtual('date_of_death_dd_mm_yyyy')
    .get(function () {
        return DateTime.fromJSDate(this.date_of_death).toISODate();
    })

// Export model.
module.exports = mongoose.model('Author' , AuthorSchema);