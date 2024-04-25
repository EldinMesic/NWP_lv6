const User = require('../models/user');
const Project = require('../models/project');

async function renderProjectPage(req, res, next) {
    const message = req.query.message || null;

    var project = await Project.findById(req.params.id);

    if(!project){
        return res.redirect('/?message=Project not found');
    }

    const users = await User.find();
    const projectUsers = await User.find({ _id: { $in: project.users } });

    res.render('../views/projects/project', {message: message, project: project, projectUsers: projectUsers, users: users});
}  
async function renderCreateProjectPage(req, res, next) {
    const message = req.query.message || null;

    const users = await User.find();
    res.render('../views/projects/create', {message: message, users: users});
}
async function renderIndexPage(req, res, next){
    const message = req.query.message || null;

    const projects = await Project.find();
    
    res.render('../views/projects/index', {message: message, projects: projects});
}

async function create(req, res){
    const { name, description, completed_jobs, price, start_date, end_date} = req.body;

    var users = req.body['users[]'];
    if (!Array.isArray(users)) {
        users = [users];
    }
    users = users.filter(value => value !== null && value !== '');
    users = new Set(users);
    users = Array.from(users);

    try {
        const project = new Project({
            name,
            description,
            price,
            completed_jobs,
            start_date,
            end_date,
            users
        });

        await project.save();

        const usersToUpdate = await User.find({ _id: { $in: users } });

        await Promise.all(usersToUpdate.map(async user => {
            user.projects.push(project._id);
            await user.save();
        }));

        res.redirect('../projects?message=Project Created Successfully');
    } catch (error) {
        res.redirect(`../projects/create?message=${error}`);
    }
}
async function deleteProject(req, res, next){
    const id = req.params.id;
    const project = await Project.findById(id);
    
    if (!project) {
        return res.redirect(`../projects?message=There is no such Project`);
    }

    try {
        await Project.deleteOne(project);
        await User.updateMany(
            { projects: id },
            { $pull: { projects: id } }
        );
        res.redirect(`../projects`);
    } catch (error) {
        res.redirect(`../projects?message=${error}`);
    }
}
async function update(req, res, next){
    try {
        const projectId = req.params.id;
        
        const { name, description, completed_jobs, price, start_date, end_date} = req.body;

        var users = req.body['users[]'];
        if (!Array.isArray(users)) {
            users = [users];
        }
        users = users.filter(value => value !== null && value !== '');
        users = new Set(users);
        users = Array.from(users);

        const originalProject = await Project.findById(projectId);
        const updatedProject = await Project.findByIdAndUpdate(projectId, {name, description, completed_jobs, price, start_date, end_date, users}, { new: true });

        if (!updatedProject) {
            return res.redirect('/?message=An Error occured');
        }

        const originalUsers = await User.find({ _id: { $in: originalProject.users } });
        const originalUserIds = originalUsers.map(user => user._id.toString());
        console.log(originalUserIds);
        console.log("/n");
        console.log(users);
        const usersToAdd = users.filter(userId => !originalUserIds.includes(userId));
        const usersToRemove = originalUserIds.filter(userId => !users.includes(userId));


        await User.updateMany(
            { _id: { $in: usersToAdd } },
            { $addToSet: { projects: projectId } }
        );
        await User.updateMany(
            { _id: { $in: usersToRemove } },
            { $pull: { projects: projectId } }
        );

        return res.redirect(`/projects/${projectId}?message=Successfully Updated Project`);
    } catch (error) {
        return res.redirect('/?message=An Error occured');
    }
}

module.exports = {
    renderProjectPage,
    renderCreateProjectPage,
    renderIndexPage,
    create,
    deleteProject,
    update
};