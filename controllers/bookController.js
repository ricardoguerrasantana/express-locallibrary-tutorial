const { body , validationResult } = require('express-validator');
const Book = require('../models/book');
const Author = require('../models/author');
const Genre = require('../models/genre');
const BookInstance = require('../models/bookinstance');

const async = require('async');
const book = require('../models/book');
const genre = require('../models/genre');

exports.index = function(req, res) {
    async.parallel({
        book_count: function (callback) {
            Book.countDocuments({} , callback); // Pass an empty object as match condition to find all documents of this collection
        } , 
        book_instance_count: function (callback) {
            BookInstance.countDocuments({} , callback);
        } , 
        book_instance_available_count: function (callback) {
            BookInstance.countDocuments({status: 'Available'} , callback);
        } ,
        author_count: function (callback) {
            Author.countDocuments({} , callback);
        } , 
        genre_count: function (callback) {
            Genre.countDocuments({} , callback);
        } 
    } , 
    function (err , results) {
        res.render('index' , {
            title: 'Local Libary Home' , 
            error: err , 
            data: results
        });
    });
};

// Display list of all books.
exports.book_list = function(req, res , next) {
    
    Book.find({} , 'title author')
        .populate('author')
        .exec(function (err, list_books) {
            if (err) return next(err);
            // Successful, so render
            res.render('book_list' , {
                title: 'Book List' , 
                book_list: list_books
            });
        });

};

// Display detail page for a specific book.
exports.book_detail = function(req , res , next) {
    
    async.parallel({
        book: function (callback) {
            Book.findById(req.params.id)
                .populate('author')
                .populate('genre')
                .exec(callback);
        } , 
        book_instances: function (callback) {
            BookInstance.find({ 'book': req.params.id })
                .exec(callback);
        } , 
    } , function (err , results) {
        if (err) { return next(err) };
        if (results.book==null) {
            const err = new Error('Book not found');
            err.status = 404;
            return next(err);
        }
        // Successful, so render
        res.render('book_detail' , {
            title: results.book.title , 
            book: results.book , 
            book_instances: results.book_instances
        });
    });

};

// Display book create form on GET.
exports.book_create_get = function(req , res , next) {

    // Get all authors and genres, which we can use for adding to our book.
    async.parallel({
        authors: function (callback) {
            Author.find(callback);
        } , 
        genres: function (callback) {
            Genre.find(callback);
        } ,
    } , function (err , results) {
        if (err) { return next(err); }
        res.render('book_form' , {
            title: 'Create a book' ,
            authors: results.authors , 
            genres: results.genres ,
        })
    });
};

// Handle book create on POST.
exports.book_create_post = [
    // Convert the genre to an array.
    (req , res , next) => {
        if(!(req.body.genre instanceof Array)) {
            if(typeof req.body.genre === 'undefined') {
                req.body.genre = [];
            } else {
                req.body.genre = new Array(req.body.genre);
            }
        }
        next();
    } , 
    // Validate and sanitise fields.
    body('title' , 'Title must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('author' , "Author must not be empty.").trim().isLength({ min: 1 }).escape(),
    body('summary' , 'Summary must not be empty').trim().isLength({ min: 1 }).escape(),
    body('isbn' , "ISBN must not be empty").trim().isLength({ min: 1 }).escape(),
    body('genre.*').escape(),

    // Process resquest after validation and sanitization.
    (req , res , next) => {

        // Extract the validation errors from a resquest.
        const errors = validationResult(req);

        // Create a Book object with escaped and trimmed data.
        const book = new Book(req.body);

        if (!errors.isEmpty()) {
            // There are errors. Render the form again with validated and sanitized values/errors messages.
            
            // Get all authors and genres for form.
            async.parallel({
                authors: function (callback) {
                    Author.find(callback);
                } , 
                genres: function (callback) {
                    Genre.find(callback);
                } ,
            } , function (err , results) {
                if (err) { return next(err); }
                
                // Mark our selected genre as checked.
                for (let i = 0 ; i < results.genre.length ; i++) {
                    if(book.genre.indexOf(results.genres[i]._id) > -1) {
                        results.genre[i].checked = 'true';
                    }
                }
                res.render('book_form' , {
                    title: "Create Book" , 
                    authors: results.authors , 
                    genre: results.genre , 
                    book: book , 
                    errors: errors.array()
                })
            });
            return;

        } else {
            // Data from form is valid. Save book.
            book.save(function (err) {
                if (err) { return next(err); }
                // Successful - redirect to new book record.
                res.redirect(book.url);
            });
        }

    }
];

// Display book delete form on GET.
exports.book_delete_get = function (req , res , next) {
    
    async.parallel({
        book: function (callback) {
            Book.findById(req.params.id)
            .populate('author')
            .populate('genre')
            .exec(callback);
        } , 
        bookinstances: function (callback) {
            BookInstance.find({ 'book': req.params.id }).exec(callback);
        }
    } , function (err , results) {
        if (err) { return next(err); }
        if (results.book==null) {
            // No books found with the provided id -> Redirect to book list
            res.redirect('/catalog/books');
        }
        // There are book instances -> Render delete form
        res.render('book_delete' , {
            title: "Delete book" , 
            book: results.book , 
            bookinstances: results.bookinstances , 
        });
    });

};

// Handle book delete on POST.
exports.book_delete_post = function(req , res , next) {
    
    async.parallel({
        book: function (callback) {
            Book.findById(req.body.bookid)
                .populate('author')
                .populate('genre')
                .exec(callback);
        } , 
        bookinstances: function (callback) {
            BookInstance.find({ 'book': req.body.bookid }).exec(callback);
        }
    } , function (err , results) {
        if (err) { return next(err); }
        // Success
        if (results.bookinstances.length > 0) {
            // Book still has instances -> Render in the same way as for GET route.
            res.render('book_delete' , {
                title: "Delete book" , 
                book: results.book , 
                bookinstances: results.bookinstances , 
            });
            return;
        }
        if (results.book==null) {
            // Book to delete not found -> Redirect to book catalog.
            res.redirect('/catalog/books');
        }
        // Otherwise, delete the book
        Book.findByIdAndRemove(req.body.bookid , function deleteBook(err) {
            if (err) { return next(err); }
            // Success, so redirect to book catalog
            res.redirect('/catalog/books');
        });
    });

};

// Display book update form on GET.
exports.book_update_get = function(req , res , next) {
    
    // Get book, authors and Genres for form. 
    async.parallel({
        book: function (callback) {
            Book.findById(req.params.id).populate('author').populate('genre').exec(callback);
        } ,
        authors: function (callback) {
            Author.find(callback);
        } ,
        genres: function (callback) {
            Genre.find(callback);
        } 
    } , function (err , results) {
        if (err) { return next(err); }
        if (results.book==null) { // No results
            const err = new Error('Book not found.');
            err.status = 404;
            return next(err);
        }
        // Success.
        // Mark our selected genres as checked.
        results.genres.forEach((genre , i) => {
            results.book.genre.forEach(book_genre => {
                if (genre._id.toString()===book_genre._id.toString()) {
                    results.genres[i].checked='true';
                }
            });
        });
        res.render('book_form' , {
            title: 'Update Book' ,
            authors: results.authors , 
            genres: results.genres ,
            book: results.book 
        });
    });

};

// Handle book update on POST.
exports.book_update_post = [
    
    // Convert the genre to an array
    (req , res , next) => {
        if (!(req.body.genre instanceof Array)) {
            if (typeof req.body.genre === 'undefined') {
                req.body.genre = [];
            } else {
                req.body.genre = new Array(req.body.genre);
            }
        }
        next();
    } , 
        
    // Validate and sanitise fields.
    body('title', 'Title must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('author', 'Author must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('summary', 'Summary must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('isbn', 'ISBN must not be empty').trim().isLength({ min: 1 }).escape(),
    body('genre.*').escape(),
    
    // Process resquest after validation and sanitization.
    (req , res , next) => {

        // Extract validation errors from a request.
        const errors = validationResult(req);

        // Create a Book object with escaped/trimmed data and old id.
        const { title , author , summary , isbn , genre } = req.body;

        const book = new Book({
            title: title , 
            author: author , 
            summary: summary , 
            isbn: isbn , 
            genre: genre ,
            _id: req.params.id
        }); 

        if (!errors.isEmpty()) {
        // There are errors. Render the form again with sanitized value/error messages.

            // Get all author and genre for form.
            async.parallel({
                authors: function (callback) {
                    Author.find(callback);
                } , 
                genres: function (callback) {
                    Genre.find(callback);
                }
            } , function (err , results) {
                if (err) { return next(err); }

                // Mark our selected genre as checked.
                results.genres.forEach((genre , i) => {
                    if (book.genre.indexOf(genre._id) > -1) {
                        results.genres[i].checked = 'true';
                    }
                });
                res.render('book_form' , {
                    title: 'Update Book' , 
                    authors: results.authors , 
                    genres: results.genres ,
                    book : book , 
                    errors: errors.array()
                })
            });
            return;
        } else {
            // Data from form is valid. Update the record.
            Book.findByIdAndUpdate(req.params.id , book , {} , function (err , updated_book) {
                if (err) { return next(err); }
                // Successful -> Redirect to book detail page.
                res.redirect(updated_book.url);
            });
        }
    }
];