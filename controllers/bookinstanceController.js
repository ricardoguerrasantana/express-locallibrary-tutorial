const { body , validationResult } = require('express-validator');
const Book = require('../models/book');
const async = require('async');
const BookInstance = require('../models/bookinstance');
const { findById } = require('../models/book');

// Display list of all BookInstances.
exports.bookinstance_list = function(req , res , next) {
    
    BookInstance.find()
        .populate('book')
        .exec(function (err , list_bookinstances) {
            if (err) return next(err);
            // Sucessful, so render
            res.render('bookinstance_list' , {
                title: 'Book Instance List' , 
                bookinstance_list: list_bookinstances
            });
        });

};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function(req , res , next) {
    
    BookInstance.findById(req.params.id)
        .populate('book')
        .exec(function (err , bookinstance) {
            if (err) { return next(err) };
            if (bookinstance==null) {
                const err = new Error('Book copy not found.');
                err.status = 404;
                return next(err);
            };
            // Successful, so render
            res.render('bookinstance_detail' , {
                title: `Copy: ${bookinstance.book.title}` , 
                bookinstance: bookinstance , 
            });
        });

};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function(req , res , next) {
    
    Book.find({} , 'title')
        .exec(function (err , books) {
            if (err) { return next(err); }
            // Successful, so render.
            res.render('bookinstance_form' , {
                title: 'Create BookInstance' , 
                book_list: books , 
                status_list: ["Maintenance" , "Available" , "Loaned" , "Reserved" ]
            });
        });

};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [

    // Validate and sanitize fields.
    body('book' , 'Book must be specified').trim().isLength({ min: 1 }).escape(),
    body('imprint' , 'Imprint must be specified').trim().isLength({ min: 1 }).escape(),
    body('status').escape(),
    body('due_back' , 'invalid date').optional({ checkFalsy: true }).isISO8601().toDate(),

    // Process request after vaidation and sanitization.
    (req , res , next) => {

        // Extract the validation error from a request.
        const errors = validationResult(req);

        // Create an BookInstance object with escaped and trimmed data.
        const bookinstance = new BookInstance({
            book: req.body.book , 
            imprint: req.body.imprint , 
            status: req.body.status , 
            due_back: req.body.due_back
        });

        if(!errors.isEmpty()) {
            // There are errors. Render the form again with sanitized values and error messages.
            Book.find({} , 'title')
                .exec(function (err , books) {
                    if (err) { return next(err); }
                    // Successful, so render.
                    res.render('bookinstance_form' , {
                        title: "Create BookInstance" , 
                        book_list: books , 
                        selected_book: bookinstance.book._id , 
                        errors: errors.array() , 
                        bookinstance: bookinstance , 
                        status_list: ["Maintenance" , "Available" , "Loaned" , "Reserved" ] ,
                    });
                });
                return;

        } else {
            // Data from form is valid.
            bookinstance.save(function(err) {
                if (err) { return next(err); }
                // Successful -> Redirect to new record.
                res.redirect(bookinstance.url);
            });
        }

    }

];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function(req , res , next) {
    
    BookInstance.findById(req.params.id).populate('book')
        .exec(function (err , bookinstance) {
        if (err) { return next(err); }
        // Successful, so render
        res.render('bookinstance_delete' , {
            title: 'Delete BookInstance' , 
            bookinstance: bookinstance
        })
    });

};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function(req , res , next) {
    
    BookInstance.findById(req.body.bookinstanceid).exec(function (err , bookinstance) {
        if (err) { return next(err); }
        if (bookinstance==null) { 
            // No bookinstance found -> redirect to bookinstance catalog
            res.redirect('/catalog/bookinstances');
        }
        // Successful -> Delete bookinstance and redirect to bookinstance catalog
        BookInstance.findByIdAndDelete(req.body.bookinstanceid).exec(function deleteBookinstance(err) {
            if (err) { return next(err); }
            // Success
            res.redirect('/catalog/bookinstances');
        })
    });

};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function(req , res , next) {
    
    async.parallel({
        bookinstance: function (callback) {
            BookInstance.findById(req.params.id).populate('book').exec(callback);
        } , 
        book_list: function (callback) {
            Book.find({} , 'title').exec(callback);
        }
    } , function (err , results) {
        if (err) { return next(err); }
        if (results.bookinstance==null) { // No results.
            const err = new Error('BookInstance not found.');
            err.status = 404;
            return next(err);
        }
        // Success. Render bookinstance for form.
        res.render('bookinstance_form' , {
            title: 'Update BookInstance' , 
            bookinstance: results.bookinstance , 
            book_list: results.book_list , 
            status_list: ["Maintenance" , "Available" , "Loaned" , "Reserved" ]
        })
    });

};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [

    // Validate and sanitize fields.
    body('book' , 'Book must be specified').trim().isLength({ min: 1 }).escape(),
    body('imprint' , 'Imprint must be specified').trim().isLength({ min: 1 }).escape(),
    body('status').escape(),
    body('due_back' , 'invalid date').optional({ checkFalsy: true }).isISO8601().toDate(),

    // Process request after vaidation and sanitization.
    (req , res , next) => {

        // Extract the validation error from a request.
        const errors = validationResult(req);

        // Create an BookInstance object with escaped and trimmed data.
        const bookinstance = new BookInstance({
            book: req.body.book , 
            imprint: req.body.imprint , 
            status: req.body.status , 
            due_back: req.body.due_back , 
            _id: req.params.id ,
        });

        if(!errors.isEmpty()) {
        // There are errors. Render the form again with sanitized values and error messages.
            Book.find({} , 'title')
                .exec(function (err , book_list) {
                    if (err) { return next(err); }
                    // Successful, so render.
                    res.render('bookinstance_form' , {
                        title: "Create BookInstance" , 
                        book_list: book_list , 
                        bookinstance: bookinstance , 
                        status_list: ["Maintenance" , "Available" , "Loaned" , "Reserved" ] ,
                        errors: errors.array() , 
                    });
                });
                return;

        } 
        
        // Data from form is valid.
        BookInstance.findByIdAndUpdate(req.params.id , bookinstance , {} , function(err , updated_bookinstance) {
            if (err) { return next(err); }
            // Successful -> Redirect to updated bookinstance.
            res.redirect(updated_bookinstance.url);
        });

    }

];