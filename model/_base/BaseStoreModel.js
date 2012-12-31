//
// Copyright (c) 2012-2013, Peter Jekel
// All rights reserved.
//
//	The Checkbox Tree (cbtree) is released under to following three licenses:
//
//	1 - BSD 2-Clause								(http://thejekels.com/cbtree/LICENSE)
//	2 - The "New" BSD License				(http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L13)
//	3 - The Academic Free License		(http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L43)
//
define(["dojo/_base/declare",		  // declare
				"dojo/_base/lang",				// lang.hitch()
				"dojo/aspect",						// aspect.before()
				"dojo/Deferred",
				"dojo/promise/all",
				"dojo/promise/Promise", 	// instanceof
				"dojo/Stateful",        	// set() & get()
				"dojo/when",							// when()
				"./Parents",
				"./Prologue",							// Store Prologue methods
				"../../Evented",					// on()
				"../../util/shim/Array"		// ECMA-262 Array shim
			 ], function (declare, lang, aspect, Deferred, all, Promise, Stateful,
										 when, Parents, Prologue, Evented) {
	"use strict";
		// module:
		//		cbtree/model/_base/BaseStoreModel
		// summary:
		//		Implements cbtree/models/model API connecting to any store that exposes
		//		the dojo/store/api/Store API or the extended cbtree/store/api/Store API.
		//		This model supports observable, non-observable and evented stores. Both
		//		synchronous and asynchronous store implementations are supported.
		//
		//		The BaseStoreModel is a base class providing all the functionality
		//		required to create a cbtree or dijit tree model with the following
		//		limitations:
		//
		//		1 - Each model derived from BaseStoreModel MUST implement their own
		//				getChildren() method.

	var moduleName = "cbTree/model/_base/BaseStoreModel";
	var undef;

	function returnTrue () {
		// summary:
		//		A placeholder method which returns boolean true. This method may be
		//		called if the store doesn't provide certain capabilities.
		return true;
	}

	// We must include dojo/Stateful here (see dojo ticket #16515)
	var BaseStoreModel = declare([Evented, Stateful], {

		//==============================
		// Keyword arguments (kwArgs) to constructor

		// iconAttr: String
		//		If specified, get the icon from an item using this property name.
		iconAttr: "",

		// labelAttr: String
		//		If specified, get label for tree nodes using this property.
		labelAttr: "name",

		// parentProperty: String
		//		The property name of a store object identifying its parent ID(s).
		parentProperty: "parent",

		// query: Object
		//		Specifies the query object used to retrieve children of the tree root.
		//		The query property is a JavaScript key:value pairs type object.
		//		(See also: forest)
		// example:
		//		{type:'continent'}
		query: null,

		// rootLabel: String
		//		Alternative label for the root item
		rootLabel: null,

		// store: cbtree/store
		//		Underlying store. The store MUST implement, at a minimum, the dojo/store
		//		API and preferably the cbtree/store API.  For the best functionality and
		//		performance it is highly recommended to use the cbtree/store/ObjectStore
		store: null,

		// End Parameters to constructor
		//==============================

		 // root: [readonly] Object
		//		Pointer to the root item (read only, not a parameter)
		root: null,

		// _forest: Boolean
		//		Indicates if the store data should be handled as a forest or a tree
		//		hierarchy.
		//		If false, the root query must return exactly one store object as the
		//		tree root. If true, a local root item is fabricated which will serve
		//		as the tree root. Please note, the fabricated root does NOT represent
		//		an object in the store.
		_forest: false,

		// _loadRequested: Boolean
		//		Indicate if a store load has been requested.
		_loadRequested: false,

		// =======================================================================
		// Constructor

		constructor: function (/* Object */ kwArgs) {
			// summary:
			//		Passed the arguments listed above (store, etc)
			// kwArgs:
			//		A JavaScript key:value pairs object. The object properties or keys
			//		are defined above.
			// tags:
			//		private

			this._childrenCache = {};
			this._objectCache   = {};
			this._storeMethods  = {};

			this._eventable     = false;
			this._forest        = false;
			this._loadRequested = false;
			this._monitored     = false;
			this._observable    = false;
			this._writeEnabled  = true;					 // used in StoreModel-API

			this._evtHandles    = { remove: function () {} };
			this._storeLoaded   = new Deferred();

			this._storeLoader = returnTrue;			// Function returning boolean true
			this._hasChildren = returnTrue;

			declare.safeMixin(this, kwArgs);

			var props = ["add", "put", "get", "load", "hasChildren", "getChildren", "getParents",
									 "addParent", "removeParent", "queryEngine", "notify", "emit",
									 "isItem"
									];
			var store = this.store;
			var model = this;

			// Prepare the store for usage with this model. Depending on the current
			// store functionality, or lack thereof, the store may be extended with
			// additional methods, advice and/or properties.

			if (store) {
				props.forEach( function (prop) {
					if (typeof store[prop] == "function") {
						this._storeMethods[prop] = store[prop];
						switch (prop) {
							case "add":
								if (store.hierarchical !== true) {
									aspect.before( store, "add", Prologue );
								}
								break;
							case "emit":								// Eventable store
								if (store.eventable === true) {
									this._evtHandles = store.on( "change, delete, new",
																					lang.hitch(this, this._onStoreEvent));
									this._observable = false;	// evented takes precedence
									this._eventable  = true;
								}
								break;
							case "hasChildren":
								this._hasChildren = store.hasChildren;
								break;
							case "load":
								this._storeLoader = store.load;
								break;
							case "notify":								// Observable store
								if (!this._eventable) {
									this._observable = true;
								}
								break;
							case "put":
								if (store.hierarchical !== true) {
									aspect.before( store, "put", Prologue );
								}
								break;
						}
					} else {
						// Method(s) not supported by the store, extend the store with the
						// required functionality.
						switch (prop) {
							case "getChildren":
								var funcBody = "return this.query({"+this.parentProperty+": this.getIdentity(object)});"
								store.getChildren = new Function("object", funcBody);
								break;
							case "isItem":
								// NOTE: This will only work for synchronous stores...
								store.isItem = function (/*Object*/ object) {
									if (object && typeof object == "object") {
										return (object == this.get(this.getIdentity(object)));
									}
									return false;
								};
								break;
							case "get":
							case "put":
								// The store must at a minimum support get() and put()
								throw new TypeError(moduleName+"::constructor(): store MUST support put() and get() methods");
						}
					}
				}, this);

				this._monitored = (this._eventable || this._observable);

				// Exchange the "parentProperty".
				if (store.parentProperty) {
					this.parentProperty = store.parentProperty;
				} else {
					store.parentProperty = this.parentProperty;
				}
			} else {
				throw new Error(moduleName+"::constructor(): Store parameter is required");
			}
		},

		// =======================================================================
		// cbtree/model/Model API methods

		destroy: function () {
			// summary:
			//		Distroy this model releasing memory and handles.
			for(var id in this._childrenCache) {
				this._deleteCacheEntry(id);
			}
			this._evtHandles.remove();	// Remove event listeners if any..

			this._childrenCache = {};
			this._objectCache   = {};
			this.store          = undef;

		},

		fetchItemByIdentity: function (/* object */ kwArgs) {
			// summary:
			//		Fetch a store item by identity.
			// kwArgs:
			//		A JavaScript key:value pairs object that defines the item to locate
			//		and callbacks to invoke when the item has been located. The format of
			//		the object is as follows:
			// |	{
			// |		identity: String|Number,
			// |		onItem: Function,
			// |		onError: Function,
			// |		scope: object
			// |	}
			// NOTE:
			//		This method is for backward compatability with dijit/tree/model only.
			//		use store.get(identity) instead.
			// tags:
			//		public

			when ( this.store.get(kwArgs.identity),
				lang.hitch(kwArgs.scope, kwArgs.onItem),
				lang.hitch(kwArgs.scope, kwArgs.onError)
			);
		},

		getChildren: function (/*Object*/ parent, /*Function*/ onComplete, /*Function*/ onError) {
			// summary:
			//		Calls onComplete() with array of child items of given parent item,
			//		all loaded. Any model derived from BaseStoreModel MUST overwrite
			//		this method with its own specific implementation.
			//
			//		The specific getChildren() implementation MUST call the private method
			//		_getChildren() with the second argument being a method which returns
			//		the children.
			//
			//		(See example below and _getChildren() )
			// parent:
			//		The parent object for which the children will be fetched.
			// onComplete:
			//		Callback function, called on completion with an array of child items
			//		as the argumen: onComplete(children)
			// onError:
			//		Callback function, called in case an error occurred.
			// example:
			//	|		getchildren: function (parent, onComplete, onError) {
			//	|			function myGetChildren(parent, id) {
			//	|								...
			//	|				return this.store.getChildren(parent);
			//	|			}
			//	|			_getChildren(patent, myGetChildren, onComplete, onError);
			//	|		}
			// tags:
			//		public

			throw new Error( "Abstract Only - requires implementation" );
		},

		getIcon: function (/*Object*/ item) {
			// summary:
			//		Get the icon for item from the store if the iconAttr property of the
			//		model is set.
			// item:
			//		A valid dojo.store item.

			if (this.iconAttr) {
				return item[this.iconAttr];
			}
		},

		getIdentity: function (/*Object*/ item) {
			// summary:
			//		Get the identity of an item.
			// returns:
			//		A string or number.
			// tags:
			//		Public
			return this.store.getIdentity(item);
		},

		getLabel: function (/*Object*/ item) {
			// summary:
			//		Get the label for an item
			if (item === this.root && this.rootLabel) {
				return this.rootLabel;
			}
			return item[this.labelAttr];	// String
		},

		getParents: function (/*Object*/ storeItem) {
			// summary:
			//		Get the parent(s) of a store item. This model supports both single
			//		and multi parented store objects.	For example: parent:"Homer" or
			//		parent: ["Homer","Marge"]. Multi parented stores must have a query
			//		engine capable of querying properties whose value is an array.
			// storeItem:
			//		The store object whose parent(s) will be returned.
			// returns:
			//		A dojo/promise/Promise	-> Object[]
			// tags:
			//		private
			var deferred = new Deferred();
			var parents	= [];

			if (storeItem) {
				// Leverage the store if is has a getParents() method.
				if (this._storeMethods.getParents) {
					when( this.store.getParents(storeItem), function (parents) {
						deferred.resolve(parents || []);
					}, deferred.reject );
				} else {
					var parentIds = new Parents( storeItem, this.parentProperty );
					var promises	= [];

					parentIds.forEach(function (id) {
						var parent = this.store.get(id);
						if (parent) {
							when( parent, function (parent) {
								if (parent) {
									parents.push(parent);
								}
							});
							promises.push(parent);
						}
					}, this);
					/// Wait till we have all parents.
					all(promises).always( function () {
						deferred.resolve(parents);
					});
				}
			} else {
				deferred.resolve(parents);
			}
			return deferred.promise;
		},

		getRoot: function (/*Function*/ onItem, /*Function*/ onError) {
			// summary:
			//		Get the tree root. calls onItem with the root item for the tree or
			//		onError on error.
			// onItem:
			//		Function called with the root item for the tree.
			// onError:
			//		Function called in case an error occurred.
			// tag:
			//		Public
			var self = this;

			if (this.root) {
				onItem(this.root);
			} else {
				// If no store load request was issued, do so now.
				if (!this._loadRequested) {
					this._loadStore();
				}
				when( this._storeLoaded, function () {
					var result = self.store.query(self.query);
					when(result, function (items) {
						if (items.length != 1) {
							throw new Error(moduleName + ": Root query returned " + items.length +
																" items, but must return exactly one item");
						}
						self.root = items[0];
						// Setup listener to detect if root item changes
						if (result.observe) {
							result.observe( function (obj, removedFrom, insertedInto) {
								if (removedFrom == insertedInto) {
									self._onChange( obj, null );
								}
							}, true);	// true to listen for updates to obj
						}
						onItem(self.root);
					}, onError);
				});
			}
		},

		isItem: function (/*any*/ something) {
			// summary:
			//		Validate if an item (something) is an object and under control of
			//		this model and store.	This method is primarily called by the DnD
			//		module dndSource.
			// something:
			//		Any type of object.
			// tag:
			//		Public
			return this.store.isItem(something);
		},

		mayHaveChildren: function (/*Object*/ item) {
			// summary:
			//		Tells if an item has or may have children. Implementing logic here
			//		avoids showing +/- expando icon for nodes that we know don't have
			//		children.
			// item:
			//		Object.
			// returns:
			//		Boolean
			// tags:
			//		public

			var itemId = this.getIdentity(item);
			var result = this._childrenCache[itemId];
			if (result) {
				if ( !(result instanceof Promise) ) {
					return !!result.length;
				}
			}
			return this._hasChildren.call(this.store, item);
		},

		// =======================================================================
		// cbtree/model/Model API extensions

		isChildOf: function (/*Object*/ parent, /*Object*/ item) {
			// summary:
			//		Test if an item if a child of a given parent.
			// parent:
			//		The parent object.
			// child:
			//		Child object.
			// returns:
			//		Boolean true or false
			// tag:
			//		Public
			if (parent && item) {
				var parents = new Parents(item, this.parentProperty);
				return parents.contains(this.getIdentity(parent));
			}
			return false;
		},

		// =======================================================================
		// Drag-n-Drop support

		newItem: function (/*Object*/ args, /*Object*/ parent, /*int?*/ insertIndex, /*Object*/ before) {
			// summary:
			//		Creates a new item.	 See `dojo/data/api/Write` for details on args.
			//		Used in drag & drop when an item from an external source is dropped
			//		onto tree.		Whenever this method is called by Drag-n-Drop it is a
			//		clear indication that DnD determined the item to be external to the
			//		model and tree however, that doesn't mean there isn't a similar item
			//		in our store. If the item exist the multi-parent mode will determine
			//		the appropriate operation. (insert or move)
			// args:
			//		A javascript object defining the initial content of the item as a set
			//		of JavaScript key:value pairs object.
			// parent:
			//		A valid store item that will serve as the parent of the new item.
			// insertIndex:
			//		Not used.
			// before:
			//		The tree item before which the new item is to be inserted. Note: the
			//		underlaying store must provide support for the 'before' property of
			//		the Store.PutDirectives. (see dojo/store/api/Store)
			// returns:
			//		A dojo/promise/Promise	--> Object
			// tag:
			//		Public

			var mpStore = parent[this.parentProperty] instanceof Array;
			var itemId  = this.getIdentity(args);
			var self    = this;
			var result;

			parent = (this._forest && parent == this.root) ? undef : parent;

			if (itemId) {
				result = when( this.store.get(itemId), function (item) {
					if (item) {
						// An item in the store with the same identification already exists.
						var parentIds = new Parents(item, self.parentProperty);

						// If the store is multi-parented add the new parent otherwise just
						// move the item to its new parent.
						if (mpStore) {
							parentIds.add( self.getIdentity(parent), true );
							item[self.parentProperty] = parentIds.toValue();
							itemId = self.store.put(item);
							if (!self._monitored) {
								when (itemId, function () {
									self._childrenChanged( parent );
								});
							}
						} else {
							// Single parented store, move the item.
							self.getParents(item).then( function (oldParents) {
								if (oldParents.length) {
									self.pasteItem( item, oldParents[0], parent, false, insertIndex, before );
								}
							});
						}
						return item;
					} else {
						// It's a new item to the store so just add it.
						result = self.store.put(args, { parent: parent, before: before });
						return when( result, function (itemId) {
							return when (self.store.get(itemId), function (item) {
								if (item) {
									if (!self._monitored) {
										when( result, function () { self._onNewItem(item); });
									}
								}
								return item;
							});
						});
					}
				});
				return result;
			}
			// It's a new item without a predefined identification, just add it and the store
			// should generate a unique id.
			result = this.store.put(args, { parent: parent, before: before });
			return when( result, function (itemId) {
				return when (self.store.get(itemId), function (item) {
					if (item) {
						if (parent == this.root) {
							self.onRootChange(item, "new");
						}
						if (!this._monitored) {
							when( result, function () { self._onNewItem(item); });
						}
					}
					return item;
				});
			});
		},

		pasteItem: function (/*Object*/ childItem, /*Object*/ oldParentItem, /*Object*/ newParentItem,
												 /*Boolean*/ bCopy, /*int?*/ insertIndex, /*Object*/ before) {
			// summary:
			//		Move or copy an item from one parent item to another.
			//		Used in drag & drop

			var parentIds   = new Parents( childItem, this.parentProperty );
			var newParentId = this.getIdentity(newParentItem);
			var oldParentId = this.getIdentity(oldParentItem);
			var updParents  = [newParentItem];
			var self = this;

			if (oldParentId != newParentId) {
				var wasRoot = (oldParentItem == this.root);
				var isRoot	= (newParentItem == this.root);
				if (!bCopy) {
					updParents.push(oldParentItem);
					parentIds.remove(oldParentId);
				}
				if (isRoot || wasRoot) {
					this.onRootChange(childItem, (isRoot ? "attach" : "detach"));
				}
				if (!this._forest || !isRoot) {
					parentIds.add(newParentId);
				}
			}
			// Set the new parent(s) on the object and write it to the store. In order
			// to drag an object amongst its siblings the store MUST support the put
			// directive 'before'.
			childItem[this.parentProperty] = parentIds.toValue();
			var itemId = this.store.put( childItem, {before: before});
			if (!this._monitored) {
				when( itemId, function () {
					self._childrenChanged( updParents );
				});
			}
		},

		// =======================================================================
		// Private event listeners.

		_onChange: function (/*Object*/ newItem, /*Object?*/ oldItem) {
			// summary:
			//		Test which of the item properties changed, if an existing property was
			//		removed or if a new property was added.
			// newItem:
			//		An updated store item.
			// oldItem:
			//		The original store item, that is, before the store update. If oldItem
			//		is not specified the cache is search for a	match.
			// tag:
			//		Private
			var itemId = this.getIdentity(newItem);

			oldItem = oldItem || this._objectCache[itemId];
			if (oldItem) {
				var key;
				//	First, test if an existing property has changed value or if it was
				//	removed.
				for (key in oldItem) {
					if (key in newItem) {
						if (oldItem[key] != newItem[key]) {
							this._onSetItem(newItem, key, oldItem[key], newItem[key]);
						}
					} else {
						this._onSetItem(newItem, key, oldItem[key], undef);
					}
				}
				// Second, test if a new property was added.
				for (key in newItem) {
					if (!(key in oldItem) && key !== "__storeId") {
						this._onSetItem(newItem, key, undef, newItem[key]);
					}
				}
			}
			// Keep a shallow copy of the item for later property comparison.
			this._objectCache[itemId] = lang.mixin(null, newItem);
		},

		_onChildrenChange: function (/*Object*/ parent, /*Object[]*/ newChildrenList) {
			// summary:
			//		Callback to do notifications about new, updated, or deleted child
			//		items.	Models that inherit for BaseStoreModel may overwrite this
			//		method to add any additional functionality.
			// parent:
			//		The parent Object
			// newChildrenList:
			// tags:
			//		callback

			this.onChildrenChange(parent, newChildrenList);
		},

		_onDeleteItem: function (/*Object*/ item) {
			// summary:
			//		Handler for delete notifications from the store.
			// item:
			//		The store item that was deleted.
			// tag:
			//		Private
			var id	 = this.getIdentity(item);
			var self = this;

			// Because observable does not provide definitive information if the item
			// was actually deleted or just moved (re-parented) we need to check the
			// store and see if the item still exist.
			when(this.store.get(id),
				function (exists) {
					if (!exists) {
						delete self._objectCache[id];
					}
				},
				function (err) {
					delete self._objectCache[id];
				}
			);
			self._deleteCacheEntry(id);
			self.onDelete(item);

			this.getParents(item).then( function (parents) {
				if (self.isChildOf(self.root, item)) {
					self.onRootChange(item, "delete");
				}
				self._childrenChanged( parents );
			});
		},

		_onNewItem: function (/*Object*/ item) {
			// summary:
			//		Mimic the dojo/data/ItemFileReadStore onNew event.
			// item:
			//		The store item that was added.
			// tag:
			//		Private
			var self = this;

			this.getParents(item).then( function (parents) {
				if (self.isChildOf(self.root, item)) {
					self.onRootChange(item, "new");
				}
				self._childrenChanged( parents );
			});
		},

		_onSetItem: function (/*Object*/ storeItem, /*String*/ property, /*any*/ oldValue,
													 /*any*/ newValue) {
			// summary:
			//		Updates the tree view according to changes in the data store.
			// storeItem:
			//		Store item
			// property:
			//		property-name-string
			// oldValue:
			//		Old property value
			// newValue:
			//		New property value.
			// tags:
			//		extension
			var parentProp = this.parentProperty;
			var self			 = this;

			if (property === parentProp) {
				var np = new Parents(newValue, parentProp);
				var op = new Parents(oldValue, parentProp);
				var dp = [];

				np.forEach( function (parent) {
				var a =self;
				var b = op;
					if (!op.contains(parent) && self._objectCache[parent]) {
						dp.push(self._objectCache[parent]);
					}
				});

				op.forEach( function (parent) {
					if (!np.contains(parent) && self._objectCache[parent]) {
						dp.push(self._objectCache[parent]);
					}
				});
				self._childrenChanged( dp );
			}
			this.onChange(storeItem, property, newValue, oldValue);
			return true;
		},

		_onStoreEvent: function (event) {
			// summary:
			//		Common store event listener for evented stores.	An evented store
			//		typically dispatches three types of events: 'update', 'delete' or
			//		'new'.
			// event:
			//		Event recieved from the store.
			// tag:
			//		Private
			switch (event.type) {
				case "change":
					this._onChange( event.item, null );
					break;
				case "delete":
					this._onDeleteItem(event.item);
					break;
				case "new":
					this._onNewItem(event.item);
					break;
			}
		},

		// =======================================================================
		// Callbacks/Events

		onChange: function (/*Object*/ item,/*String*/ property,/*any*/ newValue,/*any*/ oldValue) {
			// summary:
			//		Callback whenever an item has changed, so that Tree
			//		can update the label, icon, etc.
			// tags:
			//		callback
		},

		onChildrenChange: function (/*Object*/ parent, /*Object[]*/ newChildrenList) {
			// summary:
			//		Callback to do notifications about new, updated, or deleted child items.
			// parent:
			// newChildrenList:
			// tags:
			//		callback
		},

		onDelete: function (/*Object*/ storeItem) {
			// summary:
			//		Callback when an item has been deleted.
			// description:
			//		Note that there will also be an onChildrenChange() callback for the parent
			//		of this item.
			// tags:
			//		callback
		},

		onRootChange: function (/*Object*/ storeItem, /*String*/ action) {
			// summary:
			//		Handler for any changes to the tree root children.
			// description:
			//		Users can extend this method to modify the new item that's being added
			//		to the root of the tree, for example to make sure the new item matches
			//		the tree root query. Remember, even though the item is dropped on the
			//		tree root it does not quarentee it matches the tree root query unless
			//		the query is simply the store identifier.
			// storeItem:
			//		The store item that was attached to, or detached from, the forest root.
			// action:
			//		String detailing the type of event: "new", "delete", "attach" or
			//		"detach"
			// tag:
			//		callback
		},

		//=========================================================================
		// Private methods

		_childrenChanged: function (/*Object|Object[]*/ parents) {
			// summary:
			//		Notify the tree the children of parents have changed. This method is
			//		called by the internal event listeners and the model API.
			// parents:
			//		Store object or an array of store objects.
			// tag:
			//		Private
			var self = this;

			parents = parents instanceof Array ? parents : [parents];
			if (parents && parents.length) {
				parents.forEach(function (parent) {
					self._deleteCacheEntry(self.getIdentity(parent));
					self.getChildren(parent, function (children) {
						self._onChildrenChange(parent, children.slice(0) );
					});
				});
			}
		},

		_deleteCacheEntry: function (/*String|Number*/ id) {
			// summary:
			//		Delete an entry from the childrens cache and remove the associated
			//		observer if any.
			// id:
			//		Store item identification.
			// tag:
			//		Private
			if (this._childrenCache[id]) {
				this._childrenCache[id].handle && this._childrenCache[id].handle.remove();
				delete this._childrenCache[id];
			}
		},

		_getChildren: function (/*Object*/ parent,/*Function*/ method,/*Function*/ onComplete,
														 /*Function*/ onError) {
			// summary:
			//		The generic dispatcher for all instances of the getChildren() method.
			//		The public getChildren() method is model and/or store specific however,
			//		the caching and dispatching of the result (the children) is common to
			//		all models.
			// parent:
			//		Parent Object.
			// method:
			//		Function to call if no children are found in the children cache for
			//		the given parent.  The function is called in the scope of the model
			//		as method(parent,id) and must return a Promise or an array or array
			//		like object with the parent's children. If a Promise is returned it
			//		MUST resolve to an array or array-like object.
			// onComplete:
			//		Callback function, called on completion with an array of child items
			//		as the argumen: onComplete(children)
			// onError:
			//		Callback function, called in case an error occurred.
			// tags:
			//		public
			var id	 = this.getIdentity(parent);
			var self = this;
			var result;

			if (this._childrenCache[id]) {
				when(this._childrenCache[id], onComplete, onError);
				return;
			}
			// Call user specified method to fetch the children
			this._childrenCache[id] = result = method.call(this, parent, id);

			if (!this._objectCache[id]) {
				this._objectCache[id] = lang.clone(parent);
			}

			// Normalize the children cache. If a store returns a Promise instead of a
			// store.QueryResults, wait for it to resolve so the children cache entries
			// are always of type store.QueryResults.
			when( result, function (queryResult) {
				queryResult.forEach( function (child) {
					self._objectCache[self.getIdentity(child)] = lang.mixin(null, child);
				});
				self._childrenCache[id] = queryResult;
			});

			// Setup listener in case the list of children changes, or the item(s) in
			// the children list are updated in some way. (Only applies to observable
			// stores).

			if (this._observable && result.observe) {
				var handle = result.observe( function (obj, removedFrom, insertedInto) {
					if (insertedInto == -1) {
						when( result, lang.hitch(self, "_onDeleteItem", obj ));
					} else if (removedFrom == -1) {
						when( result, lang.hitch(self, "_onNewItem", obj ));
					} else if (removedFrom == insertedInto) {
						when( result, lang.hitch(self, "_onChange", obj, null));
					} else {
						// insertedInto != removedFrom, this condition indicates the item
						// moved within the tree.
						when(result, function (children) {
							children = Array.prototype.slice.call(children);
							self._onChildrenChange(parent, children);
						});
					}
				}, true);	// true means to notify on item changes
				result.handle = handle; // Save the observer handle with the result.
			}
			// Call User callback AFTER registering any listeners.
			when(result, onComplete, onError);
		},

		_loadStore: function (/*Object?*/ options) {
			// summary:
			//		Issue a store load request. If the underlying store supports the
			//		load() method call it here otherwise _storeLoader() immediately
			//		returns true. (See cbtree/store/api/Store)
			// options:
			//		Arabitrary JavaScript key:value pairs object which is passed to the
			//		store load() method.
			// tag:
			//		Private
			this._loadRequested = true;
			return when( this._storeLoader.call(this.store, options),
										this._storeLoaded.resolve,
										this._storeLoaded.reject );
		},

		_setValue: function (/*Object*/ item, /*String*/ property, /*any*/ value) {
			// summary:
			//		Set the new value of a store item property and fire the 'onChange'
			//		event if the store is not observable, not evented or when the item
			//		is the forest root.
			//item:
			//		Store object
			// property:
			//		Object property name
			// value:
			//		New value to be assigned.
			// returns:
			//		Promise, number or string.
			// tag:
			//		Private
			if (item[property] !== value) {
				var orgItem = lang.mixin(null, item);
				var result	= null;
				var self		= this;

				item[property] = value;
				result = this.store.put( item, {overwrite: true});
				if (!this._monitored) {
					when( result, function () { self._onChange(item, orgItem);	});
				}
			}
			return value;
		},

		_updateChildrenCache: function (/*String*/ operation, /*Object*/ parent,/*Object*/ child) {
			// summary:
			//		Add or remove a child from the parent children cache.
			// operation:
			//		String, "add" | "attach" | "delete" | "detach"
			// parent:
			//		The parent object.
			// child:
			//		Child object to be added or removed.
			// returns:
			//		store.QueryResult. (an array-like object).
			// tag:
			//		Private
			var parentId = this.getIdentity(parent);
			var self = this;

			// Note: The childrens cache may hold a promise...
			return when( this._childrenCache[parentId], function (children) {
				var childCache = children || [];
				var index = childCache.indexOf(child);
				var total = childCache.total || 0;

				if (operation == "add" || operation == "attach") {
					if (index == -1) {
						childCache.push(child);
						total++;
					}
				} else {
					if (index > -1) {
						childCache.splice(index,1);
						total--;
					}
				}
				childCache["total"] = total;
				self._childrenCache[parentId] = childCache;
				return childCache;
			});
		}

	});	/* end declare() */

	return BaseStoreModel;

});	/* end define() */
