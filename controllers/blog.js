const Blog = require('../models/blog')
const Category = require('../models/category')
const Tag = require('../models/tag')
const formidable = require('formidable')
const slugify = require('slugify')
const stripHtml = require('string-strip-html')
const _ = require('lodash')
const {errorHandler} = require('../helpers/dbErrorHandler')
const fs = require('fs')
const {smartTrim} = require('../helpers/blog')

exports.create = (req,res)=>{
    let form = new formidable.IncomingForm()
    form.keepExtensions = true
    form.parse(req, (error, fields, files)=>{
        if(error){
            return res.status(400).json({
                error:'Image could not upload'
            })
        }

        const {title, body, categories, tags} = fields

        if(!title || !title.length){
            return res.status(400).json({
                error: 'title is required'
            })
        }
        if(!body || body.length < 200){
            return res.status(400).json({
                error: 'Content is too short'
            })
        }
        if(!categories || categories.length === 0){
            return res.status(400).json({
                error: 'At least one category is required'
            })
        }
        if(!tags || tags.length === 0){
            return res.status(400).json({
                error: 'At least one tag is required'
            })
        }

        let blog = new Blog()
        blog.title = title
        blog.body = body
        blog.excerpt = smartTrim(body, 500, ' ', ' ...')
        blog.slug = slugify(title).toLowerCase()
        blog.mtitle = `${title} | ${process.env.APP_NAME}`
        blog.mdesc = stripHtml(body.substring(0, 160))
        blog.postedBy = req.user._id
        let arrayOfCategories = categories && categories.split(',')
        let arrayOfTags = tags && tags.split(',')
  
        if(files.photo){
            if(files.photo.size > 1000000){
                return res.status(400).json({
                    error:'Image size should be less than 1mb'
                })
            }
            blog.photo.data = fs.readFileSync(files.photo.path)
            blog.photo.contentType = files.photo.type
        }

        blog.save((error, result)=>{
            if(error){
                return res.status(400).json({
                    error: errorHandler(error)
                })
            }
            
            Blog.findByIdAndUpdate(result._id, {$push:{categories:arrayOfCategories, tags:arrayOfTags}}, {new:true}).exec((error, result)=>{
                if(error){
                    return res.status(400).json({
                        error:errorHandler(error)
                    })
                }else{
                    res.json(result)
                }
            })
        })
    })
}

exports.list = (req,res) =>{
    Blog.find()
    .populate('categories', '_id name slug')
    .populate('tags', '_id name slug')
    .populate('postedBy', '_id name username')
    .select('-photo -body')
    .sort({updatedAt: -1})
    .exec((error, data)=>{
        if(error){
            return res.json({
                error: errorHandler(error)
            })
        }
        res.json(data)
    })
}

exports.listAllBlogsCategoriesTags = (req,res) =>{
    let limit = req.body.limit ? parseInt(req.body.limit) : 10
    let skip = req.body.skip ? parseInt(req.body.skip) : 0
    let blogs, categories, tags;

    Blog.find()
    .populate('categories', '_id name slug')
    .populate('tags', '_id name slug')
    .populate('postedBy', '_id name username profile')
    .sort({updatedAt: -1})
    .skip(skip)
    .limit(limit)
    .select('-photo -body')
    .exec((error, data)=>{
        if(error){
            return res.json({
                error: errorHandler(error)
            })
        }
        blogs = data
        Category.find().exec((error, c)=>{
            if(error){
                if(error){
                    return res.json({
                        error: errorHandler(error)
                    })
                }
            }
            categories = c

            Tag.find().exec((error, t)=>{
                if(error){
                    if(error){
                        return res.json({
                            error: errorHandler(error)
                        })
                    }
                }
                tags = t

                res.json({blogs, categories, tags, size:blogs.length})
            })
        })
    })
}

exports.read = (req,res) =>{
    const slug = req.params.slug.toLowerCase()
    Blog.findOne({slug})
    .populate('categories', '_id name slug')
    .populate('tags', '_id name slug')
    .populate('postedBy', '_id name username profile')
    .select('-photo -excerpt')
    .exec((error, data)=>{
        if(error){
            return res.json({
                error: errorHandler(error)
            })
        }
        res.json(data)
    })
}

exports.remove = (req,res) =>{
    const slug = req.params.slug.toLowerCase()
    Blog.findOneAndRemove({slug}).exec((error, data)=>{
        if(error){
            return res.json({
                error: errorHandler(error)
            })
        }
        res.json({
            message:'Blog deleted successfully'
        })
    })
}

exports.update = (req,res) =>{
    const slug = req.params.slug.toLowerCase()

    Blog.findOne({slug}).exec((error, oldBlog)=>{
        if(error){
            return res.status(400).json({
                error: errorHandler(error)
            })
        }
        let form = new formidable.IncomingForm()
        form.keepExtensions = true

        form.parse(req, (error, fields, files)=>{
            if(error){
                return res.status(400).json({
                    error:'Image could not upload'
                })
            }
    
            let oldSlug = oldBlog.slug
            newBlog = _.extend(oldBlog, fields)
            newBlog.slug = oldSlug

            const {body, categories, tags}= fields

            if(body){
                newBlog.excerpt = smartTrim(body, 500, ' ', ' ...')
                newBlog.mdesc = stripHtml(body.substring(0, 160))
            }
            
            if(categories){
                newBlog.categories = categories.split(',')
            }

            if(tags){
                newBlog.tags = tags.split(',')
            }
      
            if(files.photo){
                if(files.photo.size > 1000000){
                    return res.status(400).json({
                        error:'Image size should be less than 1mb'
                    })
                }
                newBlog.photo.data = fs.readFileSync(files.photo.path)
                newBlog.photo.contentType = files.photo.type
            }
    
            newBlog.save((error, result)=>{
                if(error){
                    return res.status(400).json({
                        error: errorHandler(error)
                    })
                }
                result.photo = undefined;
                res.json(result)
            })
        })
    })    
}

exports.photo = (req, res)=>{
    const slug = req.params.slug.toLowerCase()
    Blog.findOne({slug})
    .select('photo')
    .exec((error, blog)=>{
        if(error || !blog){
            return res.status(400).json({
                error: errorHandler(error)
            })
        }
        res.set('Content-Type', blog.photo.contentType)
        return res.send(blog.photo.data)
    })
}

exports.listRelated = (req,res)=>{
    let limit = req.body.limit ? parseInt(req.body.limit) : 3
    const {_id, categories} = req.body.blog

    Blog.find({_id: {$ne: _id}, categories:{$in: categories}})
    .limit(limit)
    .populate('postedBy', '_id name profile')
    .select('title slug excerpt postedBy createdAt updatedAt')
    .exec((error, blogs) =>{
        if(error){
            return res.status(400).json({
                error: 'Blogs not found'
            })
        }
        res.json(blogs)
    })
}