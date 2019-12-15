const Category = require('../models/category')
const Blog = require('../models/blog')
const slugify = require('slugify')
const {errorHandler} = require('../helpers/dbErrorHandler')

exports.create = (req, res)=>{
    const {name} = req.body
    let slug = slugify(name).toLowerCase()

    let category = new Category({name, slug})

    category.save((error, data)=>{
        if(error){
            return res.status(400).json({
                error: errorHandler(error)
            })
        }
        res.json(data)
    })
}

exports.list = (req,res) =>{
    Category.find().exec((error, data)=>{
        if(error){
            return res.status(400).json({
                error:errorHandler(error)
            })
        }
        res.json(data)
    })
}

exports.read = (req, res) =>{
    const slug = req.params.slug.toLowerCase()
    Category.findOne({slug}).exec((error, category)=>{
        if(error){
            return res.status(400).json({
                error:errorHandler(error)
            })
        }
        // res.json(category)
        Blog.find({categories:category})
        .populate('categories', '_id name slug')
        .populate('tags', '_id name slug')
        .populate('postedBy', '_id name')
        .select('_id title slug excerpt categories postedBy tags createdAt updatedAt')
        .exec((error, data)=>{
            if(error){
                return res.status(400).json({
                    error:errorHandler(error)
                })
            }
            res.json({category:category, blogs:data})
        })
    })
}

exports.remove = (req,res)=>{
    const slug = req.params.slug.toLowerCase()
    Category.findOneAndRemove({slug}).exec((error, data)=>{
        if(error){
            return res.status(400).json({
                error:errorHandler(error)
            })
        }
        res.json({
            message:'Category deleted successfully'
        })
    })
}






