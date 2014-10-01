$(function(){

    // Task Model
    var Task = Backbone.Model.extend({

        // Default attributes for the task item.
        defaults: function() {
            return {
                title: "",
                order: Todos.nextOrder(),
                done: false,
                state: 'waiting'
            };
        },

        // Toggle the `done` state of this todo item.
        toggle: function() {
            this.save({done: !this.get("done")});
        }

    });

    // Task Collection
    // ---------------

    // The collection of Tasks is backed by *localStorage* instead of a remote
    // server.
    var TaskList = Backbone.Collection.extend({

        // Reference to this collection's model.
        model: Task,

        // Save all of the Task items under the `"tasks-backbone"` namespace.
        localStorage: new Backbone.LocalStorage("tasks-backbone"),

        // Filter down the list of all Task items that are finished.
        done: function() {
            return this.where({done: true});
        },

        // Filter down the list to only Task items that are still not finished.
        remaining: function() {
            return this.where({done: false});
        },

        // We keep the Tasks in sequential order, despite being saved by unordered
        // GUID in the database. This generates the next order number for new items.
        nextOrder: function() {
            if (!this.length) return 1;
            return this.last().get('order') + 1;
        },

        // Tasks are sorted by their original insertion order.
        comparator: 'order'

    });

    // Create our global collection of **Tasks**.
    var Tasks = new TaskList;

    // Task Item View
    // --------------

    // The DOM element for a Task item...
    var TaskView = Backbone.View.extend({

        //... is a list tag.
        tagName:  "li",

        // Cache the template function for a single item.
        template: _.template($('#item-template').html()),

        // The DOM events specific to an item.
        events: {
            "click .toggle"   : "toggleDone",
            "dblclick .view"  : "edit",
            "click a.destroy" : "clear",
            "keypress .edit"  : "updateOnEnter",
            "blur .edit"      : "close"
        },

        // The TaskView listens for changes to its model, re-rendering. Since there's
        // a one-to-one correspondence between a **Task** and a **TaskView** in this
        // app, we set a direct reference on the model for convenience.
        initialize: function() {
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'destroy', this.remove);
        },

        // Re-render the titles of the Task item.
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            this.$el.toggleClass('done', this.model.get('done'));
            this.input = this.$('.edit');
            return this;
        },

        // Toggle the `"done"` state of the model.
        toggleDone: function() {
            this.model.toggle();
        },

        // Switch this view into `"editing"` mode, displaying the input field.
        edit: function() {
            this.$el.addClass("editing");
            this.input.focus();
        },

        // Close the `"editing"` mode, saving changes to the Task.
        close: function() {
            var value = this.input.val();
            if (!value) {
                this.clear();
            } else {
                this.model.save({title: value});
                this.$el.removeClass("editing");
            }
        },

        // If you hit `enter`, we're through editing the item.
        updateOnEnter: function(e) {
            if (e.keyCode == 13) this.close();
        },

        // Remove the item, destroy the model.
        clear: function() {
            this.model.destroy();
        }

    });

    // The Application
    // ---------------

    // Our overall **AppView** is the top-level piece of UI.
    var TaskManagerView = Backbone.View.extend({

        // Instead of generating a new element, bind to the existing skeleton of
        // the App already present in the HTML.
        el: $("#Taskapp"),

        // Our template for the line of statistics at the bottom of the app.
        statsTemplate: _.template($('#stats-template').html()),

        // Delegated events for creating new items, and clearing completed ones.
        events: {
            "keypress #new-task":  "createOnEnter",
            "click #clear-completed": "clearCompleted"
        },

        // At initialization we bind to the relevant events on the `Tasks`
        // collection, when items are added or changed. Kick things off by
        // loading any preexisting Tasks that might be saved in *localStorage*.
        initialize: function() {

            this.input = this.$("#new-task");

            this.listenTo(Tasks, 'add', this.addOne);
            this.listenTo(Tasks, 'reset', this.addAll);
            this.listenTo(Tasks, 'all', this.render);

            this.footer = this.$('footer');
            this.main = $('#main');

            Tasks.fetch();
        },

        // Re-rendering the App just means refreshing the statistics -- the rest
        // of the app doesn't change.
        render: function() {
            var done = Tasks.done().length;
            var remaining = Tasks.remaining().length;
        },

        // Add a single Task item to the list by creating a view for it, and
        // appending its element to the `<ul>`.
        addOne: function(Task) {
            var view = new TaskView({model: Task});
            this.$("#task-list").append(view.render().el);
        },

        // Add all items in the **Tasks** collection at once.
        addAll: function() {
            Tasks.each(this.addOne, this);
        },

        // If you hit return in the main input field, create new **Task** model,
        // persisting it to *localStorage*.
        createOnEnter: function(e) {
            if (e.keyCode != 13) return;
            if (!this.input.val()) return;
            Tasks.create({title: this.input.val()});
            this.input.val('');
        },

        // Clear all done Task items, destroying their models.
        clearCompleted: function() {
            _.invoke(Tasks.done(), 'destroy');
            return false;
        }

    });

    // create application Task Manager
    var TaskManager = new TaskManagerView;

});