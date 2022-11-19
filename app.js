require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const _ = require("lodash");
const date = require(__dirname + "/date.js");

const app = express();

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const day = date.getDate();


// mongoDb connection and inserting default items
// mongoose.connect("mongodb://localhost:27017/todolistDB")   // for local db connection
mongoose.connect(process.env.mongoose_atlas_connection_link)  // for mongodb atlas connection

const itemsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
})

const Item = mongoose.model('Item', itemsSchema);

const item1 = new Item({
  name: "Welcome to your todolist!"
})
const item2 = new Item({
  name: "Hit the '+' button to add a new item"
})
const item3 = new Item({
  name: "<-- Hit this to delete an item"
})

const defaultItems = [item1, item2, item3];

const listSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  items: [itemsSchema]
});

const List = mongoose.model('List', listSchema);


app.get("/", function (req, res) {

  Item.find({}, (err, results) => {

    if (results.length === 0) {
      Item.insertMany(defaultItems, function (err) {
        if (!err) res.redirect("/");
      });
    }

    res.render("list", { listTitle: day, newListItems: results });
  })

});

app.post("/", async function (req, res) {

  const itemName = req.body.newItem;
  const listName = req.body.list;

  const newItem = new Item({
    name: itemName
  });

  if (listName === day) {
    await newItem.save();
    res.redirect("/");
  } else {
    // google "mongodb docs push/pull"
    // this push/pull is executed on an arrayType value
    List.updateOne(
      { name: listName },
      { $push: { items: newItem } },
      function (err) {
        if (!err) {
          res.redirect("/lists/" + listName);
        }
      }
    )
  }

});

app.post("/delete", async function (req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === day) {
    Item.findByIdAndRemove(checkedItemId, function (err) {
      if (!err) {
        res.redirect("/");
      }
    });
  } else {
    List.updateOne(
      { name: listName },
      { $pull: { items: { _id: checkedItemId } } },
      function (err) {
        if (!err) {
          res.redirect("/lists/" + listName);
        }
      }
    )
  }

});


// to avoid creating a list named "/favicon.ico"
// app.get('/favicon.ico', (req, res) => res.status(204));

// dynamic routing for custom lists
app.get("/lists/:category", function (req, res) {
  const category = _.capitalize(req.params.category);

  List.findOne({ name: category }, async (err, results) => {
    if (!err) {

      if (results === null) {
        // creating a new custom list
        const customList = new List({
          name: category,
          items: defaultItems
        });
        await customList.save();

        res.redirect("/lists/" + category);

      } else {
        // custom list exists, so loading it
        res.render("list", { listTitle: category, newListItems: results.items });
      }

    }
  });

});


app.get("/create-list", (req, res) => {
  res.render("createList", {});
});

app.post("/create-list", (req, res) => {
  const newListName = req.body.newList;
  res.redirect("/lists/" + newListName);
});



let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port);