// Get the packages we need
var express = require('express');
var mongoose = require('mongoose');
var User = require('./models/user');
var Task = require('./models/task');
var bodyParser = require('body-parser');
var router = express.Router();

//replace this with your Mongolab URL (should be digital ocean server?)
//mongoose.connect('mongodb://localhost/mp4db');
var db = mongoose.connection;
db.once('open', function(){});
mongoose.connect('mongodb://hanna:password@ds021000.mlab.com:21000/mp4db', function(err){if(err) console.log(err);});

// Create our Express application
var app = express();

// Use environment defined port or 4000
var port = process.env.PORT || 4000;

//Allow CORS so that backend and frontend could pe put on different servers
var allowCrossDomain = function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept");
	res.header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS");
	next();
};
app.use(allowCrossDomain);

// Use the body-parser package in our application
app.use(bodyParser.urlencoded({
	extended: true
}));

// All our routes will start with /api
app.use('/api', router);

//Default route here
var homeRoute = router.route('/');

homeRoute.get(function(req, res) {
  res.json({ message: 'Go to /users and /tasks to get data.', data: []});
});

var usersRoute = router.route('/users');

usersRoute.get(function(req, res) {
	var where = eval("(" + req.query.where + ")");
	var sort = eval("(" + req.query.sort + ")");
	var select = eval("(" + req.query.select + ")");
	var skip = eval(req.query.skip);
	var limit = eval(req.query.limit);
	var count = req.query.count;

	var query = User.find(where)
	.sort(sort)
	.select(select)
	.skip(skip)
	.limit(limit);

	if(count==true || count == "true")
		query.count();

	query.exec(function(err, users){
	  	if(err)
	  		res.status(404).json({message: "Error getting users", data: err});
	  	else
	  		res.status(200).json({message: "Got users", data: users});
	})
});

usersRoute.post(function(req, res) {
	var name = req.body.name;
	var email = req.body.email;

	if(!name){
		res.status(500).json({message: "Name is required", data: null});
	}
	else if(!email){
		res.status(500).json({message: "Email is required", data: null});
	}
	else {
		var user = new User();
		user.name = name;
		user.email = email;
		User.findOne({"email": email}, function(err, result){
			if(err)
				res.status(404).json({message: "Error adding user", data: err});
			if(result)
				res.status(500).json({message: "Email already exists", data: result});
			else{
				user.save(function(err1) {
					if(err1)
						res.status(404).json({message: "Error adding user", data: err1});
					else
						res.status(201).json({message:"User added to the database!", data: user});
				});
			}
		})
	}
});

usersRoute.options(function(req, res){
	res.writeHead(200);
	res.end();
});

var userRoute = router.route('/users/:user_id');

userRoute.get(function(req, res){
	User.findById(req.params.user_id, function(err, user){
		if(err || !user)
			res.status(404).json({message: "Error getting user", data: err});
		else 
			res.status(200).json({message: "Got user" + req.params.user_id, data: user});
	});
});

userRoute.put(function(req, res) {
	var name = req.body.name;
	var email = req.body.email;

	if(!name){
		res.status(500).json({message: "Name is required", data: null});
	}
	else if(!email){
		res.status(500).json({message: "Email is required", data: null});
	}
	else {
		User.findById(req.params.user_id, function(err, user){
			if(err || !user)
				res.status(404).json({message: "Error updating user", data: err});
			else {
				user.name = name;
				user.email = email;
				var pendingTasks = req.body.pendingTasks;
				if(!(pendingTasks === null))
					user.pendingTasks = req.body.pendingTasks;
				user.save(function(err1){
					if(err1)
						res.status(404).json({message: "Error updating user", data: err1});
					else
						res.status(201).json({message: "Updated user!", data: user});
				});
			}
		})
	}
});

userRoute.delete(function(req, res) {
	User.findByIdAndRemove(req.params.user_id, function(err, user) {
		if(err || !user)
			res.status(404).json({message: "Error deleting user", data: err});
		else
			res.status(200).json({message: "User deleted from the database!", data: user});
	});
});

var tasksRoute = router.route('/tasks');

tasksRoute.get(function(req, res) {
	var where = eval("(" + req.query.where + ")");
	var sort = eval("(" + req.query.sort + ")");
	var select = eval("(" + req.query.select + ")");
	var skip = eval(req.query.skip);
	var limit = eval(req.query.limit);
	var count = req.query.count;
	if(!limit){
		limit = 100
	}

	var query = Task.find(where)
	.sort(sort)
	.select(select)
	.skip(skip)
	.limit(limit);

	if(count == true || count == "true")
		query.count();

	query.exec(function(err, tasks){
	  	if(err)
	  		res.status(404).json({message: "Error getting tasks", data: err});
	  	else
	  		res.status(200).json({message: "Got tasks", data: tasks});
	})
});

tasksRoute.post(function(req, res) {
	var name = req.body.name;
	var deadline = req.body.deadline;
	if(!name){
		res.status(500).json({message: "Name is required", data: null});
	}
	else if(!deadline){
		res.status(500).json({message: "Deadline is required", data: null});
	}
	else {
		var task = new Task();
		task.name = name;
		task.deadline = deadline;
		var description = req.body.description;
		if(!(description=== null))
			task.description = description;
		var completed = req.body.completed;
		if(!(completed===null))
			task.completed = completed;
		var assignedUserName = req.body.assignedUserName;
		if(assignedUserName && !(assignedUserName ==='unassigned')) {
			task.assignedUserName = assignedUserName;
			User.findOne({'name':assignedUserName}, function(err, user) {
				if(err)
					res.status(404).json({message: "Error updating task", data: err});
				else {
					task.assignedUser = user._id;
					task.save(function(err) {
						if(err)
							res.status(404).json({message: "Error adding task", data: err});
						else
							res.status(201).json({message:"Task added to the database!", data: task});
					});
				}
			});
		}
		else {
			task.save(function(err) {
				if(err)
					res.status(404).json({message: "Error adding task", data: err});
				else
					res.status(201).json({message:"Task added to the database!", data: task});
			});
		}
	}
});

tasksRoute.options(function(req, res){
	res.writeHead(200);
	res.end();
});

var taskRoute = router.route('/tasks/:task_id');

taskRoute.get(function(req, res){
	Task.findById(req.params.task_id, function(err, task){
		if(err || !task)
			res.status(404).json({message: "Error getting task", data: err});
		else
			res.status(200).json({message: "Got task" + req.params.task_id, data: task});
	});
});

taskRoute.put(function(req, res) {
	var name = req.body.name;
	var deadline = req.body.deadline;
	if(!name){
		res.status(500).json({message: "Name is required", data: null});
	}
	else if(!deadline){
		res.status(500).json({message: "Deadline is required", data: null});
	}
	else {
		Task.findById(req.params.task_id, function(err, task){
			if(err || !task)
				res.status(404).json({message: "Error updating task", data: err});
			else {
				task.name = name;
				task.deadline = deadline;
				var description = req.body.description;
				if(!(description=== null))
					task.description = description;
				var completed = req.body.completed;
				if(!(completed===null))
					task.completed = completed;
				var assignedUserName = req.body.assignedUserName;
				if(assignedUserName && !(assignedUserName ==='unassigned')) {
					task.assignedUserName = assignedUserName;
					User.findOne({'name':assignedUserName}, function(err, user) {
						if(err)
							res.status(404).json({message: "Error updating task", data: err});
						else {
							task.assignedUser = user._id;
							task.save(function(err) {
								if(err)
									res.status(404).json({message: "Error updating task", data: err});
								else
									res.status(201).json({message:"Task updated!", data: task});
							});
						}
					});
				}
				else {
					task.assignedUserName = "unassigned";
					task.assignedUser = '';
					task.save(function(err) {
						if(err)
							res.status(404).json({message: "Error updating task", data: err});
						else
							res.status(201).json({message:"Task updated!", data: task});
					});
				}	
			}
		})
	}
});

taskRoute.delete(function(req, res) {
	Task.findByIdAndRemove(req.params.task_id, function(err, task) {
		if(err || !task)
			res.status(404).json({message: "Error deleting task", data: err});
		else
			res.status(200).json({message: "Task deleted from the database!", data: task});
	});
});

// Start the server
app.listen(port);
console.log('Server running on port ' + port);
