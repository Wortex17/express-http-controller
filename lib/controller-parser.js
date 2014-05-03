var fs = require("fs");
var path = require("path");

function parseControllerDescriptor(expressApp, controllerDescriptor)
{
    for(var path in controllerDescriptor)
    {
        if(controllerDescriptor.hasOwnProperty(path))
        {
            var methods = controllerDescriptor[path];
            for(var method in methods)
            {
                if(methods.hasOwnProperty(method))
                {
                    method = method.toLowerCase();
                    var methodHandler = methods[method];
                    if(typeof methodHandler === 'function')
                    {
                        expressApp[method](path, methodHandler);
                    } else {
                        console.warn(method.toUpperCase() + " \"" + path + "\" has no valid callback", controllerDescriptor);
                    }
                }
            }
        }
    }
}

/**
 * Parses a controller descriptor and sets routes in the expressApp accordingly.
 * The structure of a controllerDescriptor should be as follows:
 *
 * {
 *  Route (String): {
 *      httpmethod (String): methodHandler (Function)
 *  }
 * }
 *  See the express documentation on available methods and route syntax.
 *
 *  Don't forget that '/' can be used as fallback path (for no route given)
 * @param expressApp
 * @param controllerDescriptors
 */
function parseControllerDescriptors(expressApp, controllerDescriptors)
{
    if(!Array.isArray(controllerDescriptors))
    {
        var temp = controllerDescriptors;
        controllerDescriptors = [];
        controllerDescriptors.push(temp);
    }

    controllerDescriptors.forEach(function(descriptor){
        parseControllerDescriptor(expressApp, descriptor);
    });
}

/**
 * Searches for any files ending with ".controller.js",
 * or folders with ".controller" ending, in which index.js is loaded as controller
 * Each targeted file will then be loaded via nodes require(), and it is expected
 * that the modules exports is a function which returns the Descriptor. The function will be passed
 * the expressApp as only parameter
 * @param expressApp
 * @param paths
 * @param {Boolean} [recursive=true] Search in Subdirectories too? (Does not search in Directories marked as controllers)
 */
function parseControllerDescriptorsIn(expressApp, paths, recursive)
{
    if(recursive == undefined)
        recursive = true;

    if(!Array.isArray(paths))
    {
        var temp = paths;
        paths = [];
        paths.push(temp);
    }

    var controllerDescriptors = [];

    function loadDescriptor(fullpath){
        var controllerDescriptor = false;
        try {
            controllerDescriptor = (require(fullpath))(expressApp);
        } catch (e) {
            console.trace("Error loading Controller Descriptor @\""+fullpath+"\":", e);
        }
        if(controllerDescriptor)
            controllerDescriptors.push(controllerDescriptor);
    }

    while(paths.length > 0)
    {
        var currentPath = paths.pop();

        var controllerFiles = fs.readdirSync(currentPath);
        controllerFiles.forEach(function(filename){
            var fullFilename = currentPath+path.sep+filename;

            if(filename.substr(-14) == ".controller.js")
            {
                loadDescriptor(fullFilename);
            } else if(
                filename.substr(-11) == ".controller"
                && fs.lstatSync(fullFilename).isDirectory()
                && fs.existsSync(fullFilename + path.sep + "index.js")
                )
            {
                loadDescriptor(fullFilename + path.sep + "index.js");
            } else if(recursive && fs.lstatSync(fullFilename).isDirectory()) {
                paths.push(fullFilename);
            }
        });
    }

    parseControllerDescriptors(expressApp, controllerDescriptors);
}


module.exports.parseControllerDescriptorsIn = parseControllerDescriptorsIn;
module.exports.parseControllerDescriptors = parseControllerDescriptors;