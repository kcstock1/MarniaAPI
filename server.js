//https://codesource.io/ask/d/629-javascript-remove-quotes-from-string

const express = require('express');
const app = express();
app.enable('trust proxy');
const path = require('path');
const {Datastore} = require('@google-cloud/datastore');
const bodyParser = require('body-parser');
const e = require('express');
var session = require('express-session')
const random = require('random')
//const ds = require('./datastore');
const datastore = new Datastore();

var handlebars = require('express-handlebars').create({defaultLayout:'main'});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
const fetch = require("node-fetch");
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const CLIENT_ID = "82634600274-0c9rk8pl9mev95r5d7pjb4kojhcu01bb.apps.googleusercontent.com"



const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID);


const SLIP = "Slip";
const BOAT = "Boat";
const LOAD = "Load";
const USER = "User";

const router = express.Router();

app.use(bodyParser.json());

function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item;
}

const checkJwt = jwt({
    credentialsRequired: false,

    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://www.googleapis.com/oauth2/v1/certs`
    }),
  
    // Validate the audience and the issuer.
    issuer: `https://www.googleapis.com/oauth2/v4/token`,
    algorithms: ['RS256']
  });


/* ------------- Begin Lodging Model Functions ------------- */
function post_boat(name, type, length,owner){
    var key = datastore.key(BOAT);
    var loads = [];
	var new_boat = {"name": name, "type": type, "length": length,"loads":loads,"owner":owner};   
    return datastore.save({"key":key, "data":new_boat}).then(() => {new_boat.id = key.id; return new_boat});
}

async function post_load(volume, content){
    var key = datastore.key(LOAD);

    //Adapted from https://stackoverflow.com/questions/1531093/how-do-i-get-the-current-date-in-javascript
    var creation_date = new Date();
    var dd = String(creation_date.getDate()).padStart(2, '0');
    var mm = String(creation_date.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = creation_date.getFullYear();  
    creation_date = mm + '/' + dd + '/' + yyyy;
    console.log(creation_date);
	var new_load = {"volume": volume, "content": content,"creation_date":creation_date};   
    //return datastore.save({"key":key, "data":new_load}).then(() => {return key});
    await datastore.save({"key":key, "data":new_load});
    new_load.id = key.id;
    return new_load;
}

function post_user(name, JWT,user_id){
    var key = datastore.key(USER);
    var loads = [];
	var new_user = {"name": name, "user_id":user_id};   
    return datastore.save({"key":key, "data":new_user}).then(() => {new_user.id = key.id; return new_user});
}

/*
function get_user(id,req){
    const key = datastore.key([USER, parseInt(id,10)]);
    const q = datastore.createQuery(USER).filter('__key__', '=', key); 
    results = datastore.runQuery(q).then( (entities) => {
        entities[0][0].id = id;
		return entities[0]; //.map(fromDatastore);
    });
    return results;
  //  return results;
} */


    function get_boats_owner(req,owner){
        var q = datastore.createQuery(BOAT)
        const results = {};
        var fullUrl = req.protocol + '://' + req.get('host');
      
        return datastore.runQuery(q).then( (entities) => {
                results.items = entities[0].map(fromDatastore).filter( item => item.owner === owner ).filter( item => item.public === true );
    
                var index = 0;
    
                return results;
            });
    }



function get_boat(id,req){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    const q = datastore.createQuery(BOAT).filter('__key__', '=', key); 
    var fullUrl = req.protocol + '://' + req.get('host')    
    //console.log(datastore.runQuery(q));
    console.log("Milestone C")
    results = datastore.runQuery(q).then( (entities) => {
        //entities[0][0].loads.forEach(element => {
         //   element.self = fullUrl + '/loads/' + element.id;
        //});
        console.log("Milestone D")
        if(typeof(entities[0][0].id) != "undefined")    
        {entities[0][0].id = id;}
		return entities[0] //.map(fromDatastore);
    });
    return results;
  //  return results;
}

function get_load(id,req){
    const key = datastore.key([LOAD, parseInt(id,10)]);
    const q = datastore.createQuery(LOAD).filter('__key__', '=', key); 
    results = datastore.runQuery(q).then( (entities) => {
        entities[0][0].id = id;
		return entities[0]; //.map(fromDatastore);
    });
    return results;
  //  return results;
}


function get_boats(req,owner){
    var q = datastore.createQuery(BOAT).filter("owner",owner).limit(5);
    const results = {};
    var fullUrl = req.protocol + '://' + req.get('host');
    if(Object.keys(req.query).includes("cursor")){
        console.log("found console object"+req.query.cursor)
        q = q.start(req.query.cursor);
        
    }
	return datastore.runQuery(q).then( entities => {
          //results.items   = entities[0].filter( item => item.owner === owner )
           results.items = entities[0];
            console.log(results.items);
            var index = 0;

            for (let i = 0; i <entities[0].length;i++){  
                
            if(typeof(entities[0][i].loads) != "undefined")    
            entities[0][i].loads.forEach(element => {
                element.self = fullUrl + '/loads/' + element.id;
            });
        }
            if(entities[1].moreResults !==                                          
                Datastore.NO_MORE_RESULTS ){
                results.next = req.protocol + "://" + req.get("host") +  req.baseUrl + "/boats/" + "?cursor=" + entities[1].endCursor;
            }
			return results;
		});
}


async function get_loads(req){
    var q = datastore.createQuery(LOAD).limit(5);
    const results = {};
    if(Object.keys(req.query).includes("cursor")){
        q = q.start(req.query.cursor);
    }
	return datastore.runQuery(q).then( (entities) => {
            results.items = entities[0].map(fromDatastore);
            if(entities[1].moreResults !== 
                Datastore.NO_MORE_RESULTS ){
                results.next = req.protocol + "://" + req.get("host") +  req.baseUrl + "/loads/" + "?cursor=" + entities[1].endCursor;
            }
			return results;
		});
}

async function get_users_by_id(req,JWT,user_id){
    var q = datastore.createQuery(USER);
    const results = {};
	return datastore.runQuery(q).then( (entities) => {
            results.items = entities[0].map(fromDatastore).filter( item => item.user_id === user_id );
			return results;
		});
}


async function get_users(req,JWT){
    var q = datastore.createQuery(USER);
    const results = {};
	return datastore.runQuery(q).then( (entities) => {
            results.items = entities[0].map(fromDatastore);
			return results;
		});
}

async function get_loads_for_boat(boat_id,req){
    console.log(boat_id);
    const boat = await get_boat(parseInt(boat_id,10),req);

    arr = []
    for (var i = 0; i < boat[0].loads.length ;i++)
    {          
        var load = await get_load(boat[0].loads[i].id,req);
        boat[0].loads[i].volume = load[0].volume;
        boat[0].loads[i].content =  load[0].content;
        //console.log(boat[0].loads[i])
        //console.log("here we are");
    }

    return boat[0].loads;
}

async function put_load(id, content, volume, req){
    return get_load(id,req).then(c => {
        const key = datastore.key([LOAD, parseInt(id,10)]);
        var load = {"content": content, "volume": volume, "id": id,"creation_date":c[0].creation_date};
        var x = datastore.save({"key":key, "data":load}); 
        console.log(load);
        return load;  
})
}



async function put_boat(id, name, type, length,req,owner){
    return get_boat(id,req).then(c => {
    if(c[0].owner == owner)
    {
        const key = datastore.key([BOAT, parseInt(id,10)]);
        var boat = {"id":id, "name": name, "type": type, "length": length,"owner":c[0].owner};
        
        var x = datastore.save({"key":key, "data":boat}).then(() => {new_boat.id = key.id; return new_boat}); 
        console.log(boat);
        return boat;  
    }
    else {
        return 1;
    }
})

}

async function patch_boat(id, name, type, length,req,owner){
    return get_boat(id,req).then(a=>{
        if(a[0].owner == owner)
        {
         let new_name = (typeof name !== 'undefined')? name : a[0].name;
         let new_type = (typeof type !== 'undefined')? type : a[0].type;
         let new_length = (typeof length !== 'undefined')? length : a[0].length;
          const key = datastore.key([BOAT, parseInt(id,10)]);
          let boat = {"id":id,"name": new_name, "type": new_type, "length": new_length,"owner": a[0].owner};      
          let x =  datastore.save({"key":key, "data":boat}); 
          return boat;  
        }
        else{
            return 1;
        }
     })
 }

 async function patch_load(id, content, volume,req){
    return get_load(id,req).then(a=>{
         let new_content = (typeof content !== 'undefined')? content : a[0].content;
         let new_volume = (typeof volume !== 'undefined')? volume : a[0].volume;
          const key = datastore.key([LOAD, parseInt(id,10)]);
          let load = {"id":id,"content": new_content, "volume": new_volume, "creation_date": a[0].creation_date};      
          let x =  datastore.save({"key":key, "data":load}); 
          return load;  
     })
 }

async function assign_load(boat_id,load_id,req,res){
    var fullUrl = req.protocol + '://' + req.get('host');
   
    //Update the boat
    try{
    const key =  datastore.key([BOAT, parseInt(boat_id,10)]);

    var boat = await get_boat(boat_id,req);
    var temp_loads = boat[0].loads;
    var new_load = {"id": + load_id};  
    temp_loads.push(new_load);
    boat[0].loads = temp_loads; 

     datastore.save({"key":key, "data":boat[0]});
    boat[0].loads.forEach(element => {
            element.self = fullUrl + '/loads/' + element.id;});
        } catch {
            var Error = {"Error":"Bad Boat Id"}; 
            res.status(404).send(JSON.stringify(Error));   
            return;    
            }

    //update the load
   try{ var lkey = datastore.key([LOAD, parseInt(load_id,10)]);  
    const key =  datastore.key([BOAT, parseInt(boat_id,10)]);

    var boat = await get_boat(boat_id,req);   
    var load = await get_load(load_id,req);

    //Check if load already assigned to a boat
    /*if (load[0].carrier !== undefined)
    {
        var Error = {"Error":"Load is already assigned"}; 
        res.status(403).send(JSON.stringify(Error));  
        return;
    }*/

    var new_boat = {"id":key.id,"name":boat[0].name,"self": fullUrl + '/boats/' + key.id};
    load[0].carrier = new_boat;
    console.log(load[0]);
    datastore.save({"key":lkey, "data":load[0]});
    let added = {"Success":"Load added to boat"}; 
    res.status(201).send(JSON.stringify(added));
    //return boat[0]; 

} catch {
    var Error = {"Error":"Bad Load Id"}; 
    res.status(404).send(JSON.stringify(Error));    
    return;    2
      }

      
 };


 async function remove_load(boat_id,load_id,req){
    var fullUrl = req.protocol + '://' + req.get('host');
   
    //Update the boat
    const key =  datastore.key([BOAT, parseInt(boat_id,10)]);
    console.log("CALLING GET BOAT FROM REMOVE")
    var boat = await get_boat(boat_id,req);
    var temp_loads = boat[0].loads;

    console.log(temp_loads);
    var index =  temp_loads.indexOf(String(load_id));
    console.log(index);
    let i = 0;
    let location = -5;
    temp_loads.forEach(element => {
        if(element.id == load_id)
        {
            location = i;
        }
        i++;

    });

    if(location != -5)
    {
        temp_loads.splice(location,1);
        boat[0].loads = temp_loads;
        datastore.save({"key":key, "data":boat[0]});

    }

    //update the load
    var updated_load = await get_load(load_id,req);
    var lkey = datastore.key([LOAD, parseInt(load_id,10)]);  
    console.log(updated_load);
    updated_load[0].carrier = [];
    datastore.save({"key":lkey, "data":updated_load[0]});
    console.log(updated_load[0]);
 };

/*
async function delete_boat(id,req,res){
    try{
    const key = datastore.key([BOAT, parseInt(id,10)])
    var boat = await get_boat(id,req);
    boat[0].loads.forEach( async function (element) {
        console.log(element.id);
        var updated_load = await get_load(element.id);
        const lkey = datastore.key([LOAD, parseInt(element.id,10)])
        updated_load[0].carrier = [];
        console.log(updated_load);
        datastore.save({"key":lkey, "data":updated_load[0]});
    })
        datastore.delete(key);
        res.status(204).send(null);    
        return;

    }
    catch{
        var error = {"Error": "Invalid boat id"}; 
        res.status(404).send(JSON.stringify(error));
        return; 
    }

    
}; */

function delete_boat(id,owner,req){ 
    const key = datastore.key([BOAT, parseInt(id,10)])
    return get_boat(id,req).then(result=>
        {
            if (typeof(result[0].id !== "undefined"))
            {
                if(owner == result[0].owner)
                {
                    if(result[0].loads.length == 0)
                    {
                        return datastore.delete(key)
                    }
                    else {
                        //Remove attached loads
                        for(i=0; i < result[0].loads.length;i++)
                        {
                        //  console.log("DELETING LOAD")
                            if(i === result[0].loads.length-1)
                            {
                                remove_load(id,result[0].loads[i].id,req).then(c =>{
                                    console.log("DELETE BOAT HERE!!")
                                    return datastore.delete(key)

                                    })
                            }
                            else{
                                remove_load(id,result[0].loads[i].id,req)
                                }
                             
                         }
                    
                        }
                }
                else {
                    console.log("YOU ARE NOT THE OWNER")
                    const no_boat = 1;
                    return no_boat
                }
            
            }
                else {
                    console.log("BOAT DOESNT EXIST")
                const no_boat = 2;
                return no_boat;
                }    
     
            })
      .catch(b =>
            {
                console.log("Failure in getting key");

        }).catch(x=>{
            console.log("BOAT DOESNT EXIST")
            const no_boat = 2;
            return no_boat;
        }
        )  
}

async function delete_load(id,req,res){
    
    try {const key = datastore.key([LOAD, parseInt(id,10)]);   
    var load = await get_load(id,req);
    console.log(load[0]);

    if(typeof(load[0].carrier) !=  "undefined")
    {
        console.log(load[0].carrier.id);
        //var boat = await get_boat(String(load[0].carrier.id),req);
        await remove_load(String(load[0].carrier.id),String(id),req);

    }


    datastore.delete(key);
    var success = "Success: Load Deleted";
    res.status(204).send(JSON.stringify(error));
    return;

    }   
    catch{
        console.log("bad");
        var error =  {"Error": "Invalid load id"}; 
        res.status(404).send(JSON.stringify(error));
        return; 

    }


    //Remove any loads from thier boats
   
}

function get_boats_owner(req,owner){
    var q = datastore.createQuery(BOAT)
    const results = {};
    var fullUrl = req.protocol + '://' + req.get('host');
  
	return datastore.runQuery(q).then( (entities) => {
            results.items = entities[0].map(fromDatastore).filter( item => item.owner === owner );

            var index = 0;

			return results;
		});
}


async function get_name(token) {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: CLIENT_ID,  
    });
    const payload = ticket.getPayload();
    const username = payload['name'];
    return payload
  }


async function verify(token) {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: CLIENT_ID,  
    });

    const payload = ticket.getPayload();
    const userid = payload['sub'];
    return userid
  }

  function reformat(jwt){ 
    let jwt_raw = JSON.stringify(jwt)
    var jwt_correct = new String();
    jwt_correct = jwt_raw.toString().replace(/"/g, "");
    return jwt_correct
  }

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

router.get('/boats/:id', function(req, res){  
    if (req.headers.accept != 'application/json') {
        var Error = {"Not Acceptable":"Requests that do not accept JSON are rejected"}; 
        res.status(406).send(JSON.stringify(Error));
         } else {  
    verify(reformat(req.headers.jwt)).then(owner => {
        var fullUrl = req.protocol + '://' + req.get('host') + '' + req.originalUrl
        console.log("Milestone A")
        const boat = get_boat(req.params.id,req).then( (boat) => {

            console.log("Milestone B")
            boat[0].self = fullUrl;
            //console.log(boat[0])
            res.status(200).json(boat[0]);   
        }).catch( (boat) => {
                console.log("ERRORSSSS");
                var Error = {"Error":"No boat with this boat_id exists"}; 
                res.status(404).send(JSON.stringify(Error));
            }) 
    }).catch(b => {
        const Error = {"Error":"Invalid or expired JWT token"}; 
        res.status(401).send(JSON.stringify(Error));
    });
    
}});

router.get('/boats/:id/loads', function(req, res){
    if (req.headers.accept != 'application/json') {
        var Error = {"Not Acceptable":"Requests that do not accept JSON are rejected"}; 
        res.status(406).send(JSON.stringify(Error));
         } else {
    verify(reformat(req.headers.jwt)).then(owner => {    
    var fullUrl = req.protocol + '://' + req.get('host') + '' + req.originalUrl
    const boat = get_boat(req.params.id,req).then( (boat) => {
        boat[0].self = fullUrl;
        //onsole.log(boat[0])
        res.status(200).json(boat[0].loads);   
    }).catch( (boat) => {
            var Error = {"Error":"No boat with this boat_id exists"}; 
            res.status(404).send(JSON.stringify(Error));


    });
}).catch(b => {
    const Error = {"Error":"Invalid or expired JWT token"}; 
    res.status(401).send(JSON.stringify(Error));
});
}})

router.get('/loads/:id', function(req, res){
    verify(reformat(req.headers.jwt)).then(owner => {            
    var fullUrl = req.protocol + '://' + req.get('host') + '' + req.originalUrl
    console.log(req.params.id);
    const load = get_load(req.params.id).then( (load) => {
        load[0].self = fullUrl;
        console.log(load[0])
        res.status(200).json(load[0]);   
    }).catch( (load) => {
            console.log("ERRORSSSS");
            var Error = {"Error":"No load with this load_id exists"}; 
            res.status(404).send(JSON.stringify(Error));
        }) 
}).catch(b => {
    const Error = {"Error":"Invalid or expired JWT token"}; 
    res.status(401).send(JSON.stringify(Error));
});
})

router.get('/users/:id', function(req, res){
    verify(reformat(req.headers.jwt)).then(owner => {          
    const users = get_users_by_id(req,req.headers.jwt,owner)
	.then( (users) => {
        res.status(200).json(users);
    });
}).catch(b => {
    const Error = {"Error":"Invalid or expired JWT token"}; 
    res.status(401).send(JSON.stringify(Error));
});
})


router.get('/boats', function(req, res){
    if (req.headers.accept != 'application/json') {
        var Error = {"Not Acceptable":"Requests that do not accept JSON are rejected"}; 
        res.status(406).send(JSON.stringify(Error));
         } else {
         
    verify(reformat(req.headers.jwt)).then(owner => {     
        console.log(owner)     
    const boats = get_boats(req,owner)
	.then( (boats) => {
        res.status(200).json(boats);
    });
}).catch(b => {
    const Error = {"Error":"Invalid or expired JWT token"}; 
    res.status(401).send(JSON.stringify(Error));
});
}})

router.get('/loads', function(req, res){
    if (req.headers.accept != 'application/json') {
        var Error = {"Not Acceptable":"Requests that do not accept JSON are rejected"}; 
        res.status(406).send(JSON.stringify(Error));
    } else { 
    verify(reformat(req.headers.jwt)).then(owner => {          
    const loads = get_loads(req)
	.then( (loads) => {       
        res.status(200).json(loads);
    });
}).catch(b => {
    const Error = {"Error":"Invalid or expired JWT token"}; 
    res.status(401).send(JSON.stringify(Error));
});
}})

router.get('/users', function(req, res){
    if (req.headers.accept != 'application/json') {
        var Error = {"Not Acceptable":"Requests that do not accept JSON are rejected"}; 
        res.status(406).send(JSON.stringify(Error));
         } else {          
    const users = get_users(req)
	.then( (users) => {
        res.status(200).json(users);
})
}})

router.get('/owner/:owner_id', function(req, res){
    verify(reformat(req.headers.jwt)).then(owner => {       
    const user  = get_user(req,req.params.user_id)
	.then( (user) => {
        res.status(200).json(user);
    });
}).catch(b => {
    const Error = {"Error":"Invalid or expired JWT token"}; 
    res.status(401).send(JSON.stringify(Error));
});
})



router.post('/boats', function(req, res){ 
        verify(reformat(req.headers.jwt)).then(owner => {       
          //console.log(userid);
           if (req.headers.accept != 'application/json') {
            var Error = {"Not Acceptable":"Requests that do not accept JSON are rejected"}; 
            res.status(406).send(JSON.stringify(Error));
             }             
          else if(typeof(req.body.name) == "undefined" || typeof(req.body.type) == "undefined" ||  typeof(req.body.length) == "undefined")
        {
            var Error = {"Error":"The request object is missing at least one of the required attributes"}; 
            res.status(400).send(JSON.stringify(Error));
        } 
       
        else {
            post_boat(req.body.name,req.body.type,req.body.length,owner).then( boat => {
                boat.self = req.protocol + '://' + req.get('host') + '' + req.originalUrl + '/' + boat.id; 
                console.log(boat);                   
                res.status(201).send(JSON.stringify(boat)); 
            })
        }

    }).catch(b => {
        const Error = {"Error":"Invalid or expired JWT token"}; 
        res.status(401).send(JSON.stringify(Error));
    });
});
    


router.post('/loads', function(req, res){ 
    verify(reformat(req.headers.jwt)).then(owner => {     
        console.log("Here we are")
    if(typeof(req.body.volume) == "undefined" || typeof(req.body.content) == "undefined")
    {
        var Error = {"Error":"The request object is missing at least one of the required attributes"}; 
        res.status(400).send(JSON.stringify(Error));
    } 
    else if (req.headers.accept != 'application/json') {
        var Error = {"Not Acceptable":"Requests that do not accept JSON are rejected"}; 
        res.status(406).send(JSON.stringify(Error));
    }     
    else {
        post_load(req.body.volume,req.body.content).then( load => {
            load.self = req.protocol + '://' + req.get('host') + '' + req.originalUrl + '/' + load.id; 
            console.log(load);                   
            res.status(201).send(JSON.stringify(load)); 
        })
    }
}).catch(b => {
    const Error = {"Error":"Invalid or expired JWT token"}; 
    res.status(401).send(JSON.stringify(Error));
    });
});

router.post('/users', function(req, res){ 
    verify(reformat(req.headers.jwt)).then(b=> {return get_name(req.headers.jwt)}).then(userid => {     
    post_user(userid.name,req.body.JWT,userid.sub).then( user => {
        user.self = req.protocol + '://' + req.get('host') + '' + req.originalUrl + '/' + user.id;               
            res.status(201).send(JSON.stringify(user)); 
        })
    }).catch(b => {
        const Error = {"Error":"Invalid or expired JWT token"}; 
        res.status(401).send(JSON.stringify(Error));
        });
       
});

router.put('/loads/:id', function(req, res){  
    verify(reformat(req.headers.jwt)).then(owner => {     
    if(typeof(req.body.volume) == "undefined" || typeof(req.body.content) == "undefined")
    {
        var Error = {"Error":"The request object is missing at least one of the required attributes"}; 
        res.status(400).send(JSON.stringify(Error));
    }
    else if (req.headers.accept != 'application/json') {
        var Error = {"Not Acceptable":"Requests that do not accept JSON are rejected"}; 
        res.status(406).send(JSON.stringify(Error));
    }    else {
    console.log("Put Request Recieved")
    var load = put_load(req.params.id, req.body.content, req.body.volume,req).then( load => {
        console.log(load)

            load.self = req.protocol + '://' + req.get('host') + '' + req.originalUrl;
            res.status(201).send(JSON.stringify(load));   
        
    } )  }}).catch(b => {
    const Error = {"Error":"Invalid or expired JWT token"}; 
    res.status(401).send(JSON.stringify(Error));
    });
});

router.put('/boats/:id', function(req, res){  
    verify(reformat(req.headers.jwt)).then(owner => {     
    if(typeof(req.body.name) == "undefined" || typeof(req.body.type) == "undefined" ||  typeof(req.body.length) == "undefined")
    {
        var Error = {"Error":"The request object is missing at least one of the required attributes"}; 
        res.status(400).send(JSON.stringify(Error));
    } 
    else if (req.headers.accept != 'application/json') {
        var Error = {"Not Acceptable":"Requests that do not accept JSON are rejected"}; 
        res.status(406).send(JSON.stringify(Error));
    }  else {
    console.log("Patch Request Recieved")
    var boat = put_boat(req.params.id, req.body.name, req.body.type, req.body.length,req,owner).then( boat => {
        console.log(boat)
        if(boat == 1)
        {
            const Error = {"Error":"You are not the owner"}; 
            res.status(403).send(JSON.stringify(Error));

        }
        else {
            boat.self = req.protocol + '://' + req.get('host') + '' + req.originalUrl;
            res.status(201).send(JSON.stringify(boat));   
        }
    } )  }}).catch(b => {
    const Error = {"Error":"Invalid or expired JWT token"}; 
    res.status(401).send(JSON.stringify(Error));
    });
});


router.patch('/boats/:id', function(req, res){  
    verify(reformat(req.headers.jwt)).then(owner => {     
    console.log("Patch Request Recieved")
    var boat = patch_boat(req.params.id, req.body.name, req.body.type, req.body.length,req,owner).then( boat => {
    if(boat == 1)
    {
        const Error = {"Error":"You are not the owner"}; 
        res.status(403).send(JSON.stringify(Error));
    }
    else if (req.headers.accept != 'application/json') {
        var Error = {"Not Acceptable":"Requests that do not accept JSON are rejected"}; 
        res.status(406).send(JSON.stringify(Error));
    }    
    else {

    boat.self = req.protocol + '://' + req.get('host') + '' + req.originalUrl;
    res.status(201).send(JSON.stringify(boat)); }  
    } )  }).catch(b => {
    const Error = {"Error":"Invalid or expired JWT token"}; 
    res.status(401).send(JSON.stringify(Error));
    }).catch(b => {
        const Error = {"Error":"Invalid or expired JWT token"}; 
        res.status(401).send(JSON.stringify(Error));
        });
})

router.patch('/loads/:id', function(req, res){  
    if (req.headers.accept != 'application/json') {
        var Error = {"Not Acceptable":"Requests that do not accept JSON are rejected"}; 
        res.status(406).send(JSON.stringify(Error));
    } else {   
    verify(reformat(req.headers.jwt)).then(owner => {     
    console.log("Patch Request Recieved")
    var load = patch_load(req.params.id, req.body.content, req.body.volume, req).then( load => {
    load.self = req.protocol + '://' + req.get('host') + '' + req.originalUrl;
    res.status(201).send(JSON.stringify(load)); }  
     )  }).catch(b => {
    const Error = {"Error":"Invalid or expired JWT token"}; 
    res.status(401).send(JSON.stringify(Error));
    }).catch(b => {
        const Error = {"Error":"Invalid or expired JWT token"}; 
        res.status(401).send(JSON.stringify(Error));
        });
}})

router.put('/boats/:boat_id/loads/:load_id', function(req, res){    
    if (req.headers.accept != 'application/json') {
        var Error = {"Not Acceptable":"Requests that do not accept JSON are rejected"}; 
        res.status(406).send(JSON.stringify(Error));
    } else {   
    verify(reformat(req.headers.jwt)).then(owner => {     
    //Adding Load to Boat
    console.log("Here we are");
    var r = assign_load(req.params.boat_id,req.params.load_id,req,res);
    //console.log("After return");
    //console.log(r);
    //var return_code = boat_arrive(req.params.slip_id, req.params.boat_id);
    //console.log(return_code);
    }).catch(b => {
        const Error = {"Error":"Invalid or expired JWT token"}; 
        res.status(401).send(JSON.stringify(Error));
        });
    
    //res.status(204).send(JSON.stringify(r));   
}});

router.post('/boats/:boat_id/loads/:load_id', function(req, res){   
    const Error = {"Method not allowed":"Only put and delete support for this endpoint"}; 
    res.status(405).set('Allow', "PUT, DELETE").send(JSON.stringify(Error));

})

router.get('/boats/:boat_id/loads/:load_id', function(req, res){   
    const Error = {"Method not allowed":"Only put and delete support for this endpoint"}; 
    res.status(405).set('Allow', "PUT, DELETE").send(JSON.stringify(Error));

})


//Remove assignment
router.delete('/boats/:boat_id/loads/:load_id', function(req, res){    
    if (req.headers.accept != 'application/json') {
        var Error = {"Not Acceptable":"Requests that do not accept JSON are rejected"}; 
        res.status(406).send(JSON.stringify(Error));
    }   
    verify(reformat(req.headers.jwt)).then(owner => {     
    //Adding Load to Boat
    console.log("Here we are");
    var r = remove_load(req.params.boat_id,req.params.load_id,req);
    console.log("After return");
    console.log(r);
    //var return_code = boat_arrive(req.params.slip_id, req.params.boat_id);
    //console.log(return_code);

    
    res.status(204).send(JSON.stringify(r));   
}).catch(b => {
    const Error = {"Error":"Invalid or expired JWT token"}; 
    res.status(401).send(JSON.stringify(Error));
    });;
});


router.delete('/boats/:id', function(req, res){
    if (req.headers.accept != 'application/json') {
        var Error = {"Not Acceptable":"Requests that do not accept JSON are rejected"}; 
        res.status(406).send(JSON.stringify(Error));
    }   
    verify(reformat(req.headers.jwt)).then(owner => {   
    var Error = {"Error":"The request object is missing at least one of the required attributes"}; 
    delete_boat(req.params.id,owner,req).then(a => {
        if(a == 1)
        {
            const Error = {"Error":"You are not the owner"}; 
            res.status(403).send(JSON.stringify(Error));

        }
        if(a == 2)
        {
            const Error = {"Error":"Boat does not exist"}; 
            res.status(404).send(JSON.stringify(Error));

        }
        else 
        {res.status(204).end()}
    })
        
        

}).catch(b => {
    const Error = {"Error":"Invalid or expired JWT token"}; 
    res.status(401).send(JSON.stringify(Error));
    });;
});


router.delete('/loads/:id', function(req, res){
    if (req.headers.accept != 'application/json') {
        var Error = {"Not Acceptable":"Requests that do not accept JSON are rejected"}; 
        res.status(406).send(JSON.stringify(Error));
    } 
    else {  
    verify(reformat(req.headers.jwt)).then(owner => {   
    var Error = {"Error":"The request object is missing at least one of the required attributes"}; 
    delete_load(req.params.id,req,res)//.then(res.status(204).end());    
    //delete_lodging(req.params.id).then(res.status(200).end())
}).catch(b => {
    const Error = {"Error":"Invalid or expired JWT token"}; 
    res.status(401).send(JSON.stringify(Error));
    });;
}})


app.post('/', (req, res) => {
    // generate random string for state and store in session    
    // uniform integer in [ min, max ]
 
    const state = random.int((min = 0), (max = 1000000)) 
    //req.session.state = state
    
    const redirect_uri = "https://marina-315214.ue.r.appspot.com/oauth"  //"https://assignment6-313115.ue.r.appspot.com/oauth"
    const client_id = "82634600274-0c9rk8pl9mev95r5d7pjb4kojhcu01bb.apps.googleusercontent.com"

   const requestUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
           + '?response_type=code'
           + '&scope=profile'
           + '&state=' + state
           + '&client_id=' + client_id
           + '&redirect_uri=' + redirect_uri;
   
   console.log('requestUrl = ' + requestUrl);
   
   res.status('303').set('Location', requestUrl).end();

});

app.get('/oauth',function(req,res,next){
    var context = {};    
    const obj = {
      "code": req.query.code,
      "client_id":"82634600274-0c9rk8pl9mev95r5d7pjb4kojhcu01bb.apps.googleusercontent.com",
      "client_secret":"S1881S9LuVcK97eZIjwrmeRk",
      "redirect_uri":"https://marina-315214.ue.r.appspot.com/oauth",
      "grant_type": "authorization_code"
  }
  console.log(req)
  
   var y =  fetch('https://www.googleapis.com/oauth2/v4/token', {
    method: 'POST', // or 'PUT'
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(obj)
  }).then(x => {//console.log("hey there")
    return x.json()
  }).then(k => {

    console.log(k)
  


    const requestUrl = 'https://people.googleapis.com/v1/people/me?personFields=names'
 
    //console.log(k);

            const response =  fetch(requestUrl, {
                method: 'GET',
                headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + k.access_token
                }}
                //return k;
            ).then(
                a => {//console.log("hey there")
                return a.json()}
                ).then(b => {
                    console.log("Milestone L")  
                    console.log(b)
                    console.log(k.id_token);
                    get_name(k.id_token).then(info =>{

                        c = {"firstname":b.names[0].givenName,
                        "lastname": b.names[0].familyName,
                         "JWT": k.id_token,
                         "user_id":info.sub
                    }

                    res.render('home',c)
                return c;
                }) 
            } )
       return k })
  })
  app.get('/',function(req,res,next){
    var context = {};
    console.log("Request Recieved")
  
      res.sendFile(path.join(__dirname+'/welcome.html'));
  
    });;
  


/* ------------- End Controller Functions ------------- */

app.use('', router);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
