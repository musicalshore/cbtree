# The File Store #

The cbtree File Store implements an in-memory store whose content represent the file 
system layout of the HTTP back-end server document root directory or portions thereof.
The File Store consist of two components, the dojo client side application *FileStore.js*
and the HTTP back-end server aplication *cbtreeFileStore.php* or *cbtreeFileStore.cgi*
and is dynamically loaded by issueing HTTP GET requests to the back-end server
serving the active HTML page.

Please note that both the HTTP GET and DELETE requests are support but only GET is enabled 
by default. See the Server Side Application [configuration](#file-store-ssa-config) for
details.

#### Lazy Store Loading ####

The cbtree File Store fully supports the concept of *Lazy Loading* which is the process 
of loading back-end information ondemand, or in other words: only load what and when needed.
Depending on the store model used with the File Store the user can influence this behavior.
For example, if the File Store is used with the cbtree FileStoreModel, the 
[model properties](StoreModels.md#store-model-properties) *deferItemLoadingUntilExpand*
and *checkedStrict* actually determine how data is retreived from the back-end server.

If you elect to use a store model that requires a full store load (no lazy loading), such
as the FileStoreModel with the model property *checkedStrict* set, please check the '*Which
Application to use*' section of the [Server Side Applications](#file-store-ssapp) as 
performance may be an issue.


<h2 id="file-store-requirements">File Store Requirements</h2>

In order for the cbtree File Store to function properly your back-end server 
must host at least one of the server side applications included in the cbtree package:

* cbtreeFileStore.php
* cbtreeFileStore.cgi

See the [Server Side Application](#file-store-ssapp) section for details on how to 
select and configure the correct application for your environment and possible additional
requirements. The PHP implementation has been fully tested with PHP 5.3.1

#### File Store Restrictions ####

Dojo and the File Store (client side) use the JavaScript XHR API to communicate with the back-end
server therefore cross-domain access is, by default, denied. If you need to retreive file
system information from any server other than the one hosting the active HTML
page you must configure a so-called HTTP proxy server. (**HTTP server configuration is beyond the
scope of this document**).

The content of the in-memory File Store in treated as read-only, as a result, you can not change
file properties such as the name or path. You can however, using the setValue() or setValues() 
methods, add custom attribute/properties to any item in the store which will be writeable.
For example, the CheckBox Tree FileStoreModel adds a property called 'checked' to each item 
in the store. Custom attributes/properties are not stored on the back-end server, as soon as
you application terminates the custom attributes, and their values, are lost. 

<h2 id="file-store-ssapp">Server Side Applications</h2>

The cbtree File Store comes with two implementations of the cbtree Server Side Application,
one written in PHP the other is an ANSI-C CGI application compliant with the 
[CGI Version 1.1](http://datatracker.ietf.org/doc/rfc3875/) specification. Your HTTP 
server must host at least one of them. The following sections describe how to select the 
appropriate Server Side Application for your environment, the server requirements and 
optionally how to configure the application environment.

#### Which Application to use ####

Both applications offer the same functionality but they operates in a different HTTP 
back-end server environment each with its own requirements.  
The primary selection criteria are:

1. What application environment does your server support? PHP, CGI or both.
2. Is a complete (initial) store load required by you application?
3. The size of the file system you want to expose.

If your server only support PHP or CGI but not both the choice is simple. If, on the other hand, 
both are supported and your application requires a full store load, that is, load all available
information up-front like with the FileStoreModel that has strict parent-child relationship enabled, 
than the last question will determine the final outcome. If you operate on a large file system with
1000+ files it is highly recommended you use the ANSI-C CGI implementation.

Most scripting languages such as PHP are implemented as an interpreter and therefore slower than
any native compiled code like the ANSI-C CGI application. As an example, when loading the entire store
running both the browser application and the PHP server side aplication on the same 4 core 2.4 Mhz AMD
processor with a file system of 21,000 files takes about 14 seconds to load the store and render the tree.
Running the exact same browser application on the same platform but with the CGI application takes
only 3-4 seconds.

If your application does ***NOT*** require a full store load (lazy loading is sufficient) and none of the directories served by the
Server Side Application has hundreds of file entries you probably won't notice much of a difference
as only a relatively small amounts of processing power is required to serve each client request.

#### cbtreeFileStore.php ####

If you are planning on using the PHP implementation, your HTTP server must provide PHP support and have the
PHP JSON feature set enabled. The actual location of the server application on your back-end
server is irrelevant as long as it can be access using a formal URL. See the usage of the 
store property *baseURL* and the environment variable CBTREE_BASEPATH for more details.

#### cbtreeFileStore.cgi ####

The ANSI-C CGI application needs to be compiled for the target Operating System. 
Currently a Microsoft Windows implementation and associated Visual Studio 2008 project
is included in the cbtree package.
If you need the CGI application for another OS please refer to the inline documentation
of the *cbtree_NP.c* module for details. Module *cbtree_NP.c* is the only source module
that contains Operating System specific code.

The location to install the CGI application depends on the HTTP server configuration.
On Apache HTTP servers the application is typically installed in the /cgi-bin directory which,
if configurred properly, is outside your document root.
For Apache users, please refer to the [CGI configuration](http://httpd.apache.org/docs/2.2/howto/cgi.html)
instructions for details.

##### External Dependency #####

The ANSI-C CGI implementation requires the 'Perl Compatible Regular Expressions' library to be 
available on your system. The cbtree/stores/server/CGI/PCRE directory contains
a PCRE 8.10 windows version of the library. You can get the latest version of the PCRE
source code [here](http://pcre.org/)

***NOTE:*** 
> Please make sure the PCRE sharable image (pcre.dll on Windows) is included in your system
> path ***AND*** has been given the proper access privileges. The easies way of installing 
> PCRE on your server is to include it in your installation directory, this will also avoid
> any incompatability issues in case your system path already includes an instance of PCRE.

#### Write your own application ####

If, for whatever reason, you have to or want to write your own server side application use 
the source code of the PHP and ANSI-C implementation as a functional guideline.
Below you'll find the ABNF notation for the server request and response.

##### Request: #####

	HTTP-GET 	  ::= uri ('?' query-string)?
	query-string  ::= (qs-param ('&' qs-param)*)?
	qs-param	  ::= basePath | path | query | queryOptions | options | 
					  start | count | sort
	authToken	  ::= 'authToken' '=' json-object
	basePath	  ::= 'basePath' '=' path-rfc3986
	path		  ::= 'path' '=' path-rfc3986
	query		  ::= 'query' '=' json-object
	query-options ::= 'queryOptions' '=' json-object
	options		  ::= 'options' '=' json-array
	start		  ::= 'start' '=' number
	count		  ::= 'count' '=' number
	sort 		  ::= 'sort' '=' json-array

##### Response: #####

	response	  ::= '[' (totals ',')? (status ',')? (identifier ',')? (label ',')? file-list ']'
	totals 		  ::= '"total"' ':' number
	status		  ::= '"status"' ':' status-code
	status-code	  ::=	'200' | '204'
	identifier	  ::= '"identifier"' ':' quoted-string
	label		  ::= '"label"' ':' quoted-string
	file-list	  ::= '"items"' ':' '[' file-info* ']'
	file-info	  ::= '{' name ',' path ',' size ',' modified (',' icon)? ',' directory 
					    (',' children ',' expanded)? '}'
	name		  ::= '"name"' ':' json-string
	path		  ::= '"path"' ':' json-string
	size		  ::= '"size"' ':' number
	modified	  ::= '"modified"' ':' number
	icon		  ::= '"icon"' ':' classname-string
	directory	  ::= '"directory"' ':' ('true' | 'false')
	children	  ::= '[' file-info* ']'
	expanded	  ::= '"_EX"' ':' ('true' | 'false')
	quoted-string ::= '"' CHAR* '"'
	number		  ::= DIGIT+
	DIGIT		  ::= '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

Please refer to [http://json.org/](http://json.org/) for the JSON encoding rules.


<h2 id="file-store-ssa-config">Server Side Configuration</h2>

The Server Side Application utilizes two optional environment variables to control which HTTP request
types to support and to set a system wide basepath for the application:

CBTREE_BASEPATH

> The basePath is a URI reference (rfc 3986) relative to the server's document root used to
> compose the root directory.  If this variable is set it overwrites the basePath parameter
> in any query string and therefore becomes the server wide basepath.

	CBTREE_BASEPATH /system/wide/path

> Given the above basepath and if the document root of your server is /MyServer/htdoc the root
> directory for the Server Side Application becomes: */MyServer/htdoc/system/wide/path*

CBTREE_METHODS

> A comma separated list of HTTP methods to be supported by the Server Side Application. 
> By default only HTTP GET is supported. Possible options are uppercase GET and DELETE. Example:

	CBTREE_METHODS GET,DELETE

> If the HTTP DELETE method is to be supported you ***MUST*** define the
> CBTREE_METHODS variable with at least DELETE as its value.

#### IMPORTANT ####

Some HTTP servers require  special configuration to make environment variables available to
script or CGI application.  For example, the Apache HTTP server requires you to either use
the *SetEnv* or *PassEnv* directive. To make environment variable CBTREE_METHODS
available add the following to your httpd.conf file:

	SetEnv CBTREE_METHODS GET,DELETE

				or

	PassEnv CBTREE_METHODS

Please refer to the Apache [mod_env](http://httpd.apache.org/docs/2.2/mod/mod_env.html) section
for additional details.

Whenever you set or change the value of the environment variables you ***MUST*** restart you HTTP
server to make these values available to scripts and CGI applications.


<h2 id="file-store-Security">File Store Security</h2>

As with any application exposed to the Internet there are security issues you need to consider.
Both the PHP and CGI Server Side Application perform strict parameter checking in that any malformed
parameter is rejected resulting in a HTTP 400 (Bad Request) error response. Any attempt to access
files outside the root directory results in a HTTP 403 (Forbidden) response.

By default only HTTP GET requests are excepted, if you want to support HTTP DELETE you ***MUST***
set the server side environment variable CBTREE_METHODS. See [Server Side Configuration](#file-store-ssa-config)
for details.

#### Authentication ####

The Server Side Applications ***DO NOT*** perform any authentication. The client side can however pass
a so-called authentication token allowing you to implement you own authentication if needed.

#### File Access Restrictions ####

Neither Server Side Application will process any HTTP server directives. Therefore, any file or 
directory access restrictions in files like .htaccess are ignored by the Server Side Application. 
However, such restrictions will still be enforced by the HTTP server when users try to access the
files or directories directly.

If you have to rely on the HTTP server security, any HTTP request must be evaluated ***BEFORE***
the Server Side Application is invoked.
In addition do not rely on Operating System specific access privilages as PHP may not recognize
such features. For example, PHP does not recognize the Micorsoft Windows *hidden* file attribute.
In general, only expose files and directories that are intended for public consumption.
(See also *Hiding Files*)

#### Hiding Files ####

The Server Side Applications will recognize any file whose name starts with a dot(.) as a 'hidden' file
and exclude such files from being included in a response unless the *showHiddenFiles* option of the
File Store is set. In general, it is good pratice not to include any files you may consider private, 
hidden or not, in any directory you expose to the outside world.

***NOTE:*** Only the CGI implementation will also recognize the Microsoft Windows hidden file attribute. 

<h2 id="file-store-properties">File Store Properties</h2>

This section describes the properties of the cbtree File Store which can be passed as
arguments to the File Store constructor.

#### authToken: ####
> Object (null). An arbitrary JavaScript object which is passed to the back-end server with each XHR call.
> The File Store client does not put any restrictions on the content of the object.

#### basePath: ####
> String (""), The basePath property is a URI reference (rfc 3986) relative to the
> server's document root and used by the server side application to compose the root 
> directory, as a result the root directory is defined as:
>
> root-dir ::= document-root '/' basepath
>
> *NOTE:* If the environment variable CBTREE_BASEPATH is set on the HTTP server this
> property is ignored.

#### cache: ####
> Boolean (false)

#### childrenAttr: ####
> String ("children"), The attribute/property name of an item that specify that items children.
> Children in the context of the file store represent the content of a directory.

#### clearOnClose: ####
> Boolean (false), ClearOnClose allows the users to specify if a close call should force
> a reload or not. If set true, the store will be reset to default state.  Note that by doing
> this, all item handles will become invalid and a new fetch must be issued.

#### failOk: ####
> Boolean (false), Specifies if it is OK for the XHR calls to fail silently. If false
> an error is output on the console when the call fails.

#### options: ####
> String[] ([]). A comma separated string of keywords or an array of keyword strings. 
> The list of options is passed to the back-end server. The following
> keywords are supported:
> #### dirsOnly ####
> Include only directories in the response.
> #### iconClass ####
> Include the css classname for files and directories in the response. See *Fancy Tree Styling* 
> below.
> #### showHiddenFiles ####
> Include hidden files in the response. (see *Hidden Files* above).

#### url: ####
> String (""), The public URL of the Server Side Application serving the File Store.  
> For example: **http://MyServer/cgi-bin/cbtreeFileStore.cgi**

<h2 id="file-store-fancy">Fancy Tree Styling</h2>

The Server Side Applications support the option *iconClass* which will tell them to include a CSS
classname for each file. The classname is based on the file extension. If the *iconClass* option is
set two css classnames are included in the server response and are formatted as follows:

	classname ::= 'fileIcon' fileExtension WSP 'fileIcon'

The first character of fileExtension is always uppercase, all other characters are lowercase like in 
*fileIconXml*. The only exception is a file system directory which gets the classname *fileIconDIR* to 
distinguesh between, although not common, a file with the extension '.dir'.  
The first classname is followed by a whitespace and the generic classname "fileIcon". The generic classname is used
as a fallback in case you don't have a CSS definition for the classname with the file extension. Therefore
always make sure you at least have a CSS definition for "fileIcon".

### Predefined Icons ###
The CheckBox Tree package comes with two sets of predefined icons and associated CSS definitions. One set
is based on the Apache HTTP server 'Fancy Index' icons the other is a set of Microsoft Windows explorer 
icons. The css definitions for these icon sets must be loaded explicitly, load either
*cbtree/icons/fileIconsApache.css* ***OR*** *cbtree/icons/fileIconsMS.css* but ***NOT BOTH***.

    <link rel="stylesheet" href="/js/dojotoolkit/cbtree/icons/fileIconsMS.css" />

The included icon sprites and CCS definitions serve as an example only, they certainly do not cover all
possible file extensions. Also the Server Side Application only looks at the file extension when generating
the classname and does not look at the files content type.

### Prerequisites ###
To enable and use the Fancy Tree Styling in your applications the following requirements must be met:

* The Tree Styling extension must have been loaded. (cbtree/TreeStyling.js)
* A set of icons or an icon sprite must be available.
* A CSS definitions file must be available and loaded.
* The FileStoreMode and optionally the tree must be configured for icon support.

At the end of this document you can find a complete example of an application using the *Fancy Tree Styling*.

<h2 id="file-store-functions">File Store Functions</h2>

*********************************************
#### close( request ) ####
> Close out the store and reset the store to its initial state depending on the store
> property *clearOnClose*. If *clearOnClose* if false no action is taken.

*request:* (not used)

*********************************************
#### containsValue( item, attribute, value ) ####
> Returns true if the given attribute of item contains value.

*item:* store.item
> A valid file.store item.

*attribute:* String
> The name of an item attribute/property whose value is test.

*value:* Anything
> The value to search for.
*********************************************
#### deleteItem( storeItem, onBegin, onError, scope) #### 
> Delete a store item. Note: Support for this function must be enabled explicitly
>  (See the [CBTREE_METHODS](#file-store-ssa-config) environment variable for details).

*storeItem:* data.item
> A valid dojo.data.store item.

*onBegin:* (Optional)
> If an onBegin callback function is provided, the callback function
> will be called just once, before the XHR DELETE request is issued.
> The onBegin callback MUST return true in order to proceed with the
> deletion, any other return value will abort the operation.

*onError:* (Optional)
> The onError parameter is the callback to invoke when the item load encountered
> an error. It takes two parameter, the error object and, if available, the HTTP
> status code.

*scope:* (Optional)
> If a scope object is provided, all of the callback functions (onBegin, onError, etc)
> will be invoked in the context of the scope object. In the body of the callback
> function, the value of the "this" keyword will be the scope object otherwise
> window.global is used.

*********************************************
#### fetch( keywordArgs ) ####
> Given a query and set of defined options, such as a start and count of items
> to return, this method executes the query and makes the results available as
> data items. The format and expectations of stores is that they operate in a
> generally asynchronous manner, therefore callbacks are always used to return
> items located by the fetch parameters.

*keywordArgs:*
> The keywordArgs parameter may either be an instance of conforming to dojo.data.api.Request
> or may be a simple anonymous object. (See dojo.data.api.Read.fetch for details).

*********************************************
#### fetchItemByIdentity( keywordArgs ) ####
> Given the identity of an item, this method returns the item that has that identity through
> the keywordArgs onItem callback.

*keywordArgs:*
> An anonymous object that defines the item to locate and callbacks to invoke when the
> item has been located and load has completed. The format of the object is as follows:
> { *identity*: string|object, *onItem*: Function, *onError*: Function, *scope*: object }  
> (See dojo.data.api.Identity.fetchItemByIdentity for additional details).

*********************************************
#### getAttributes( item ) ####
> Returns an array of strings containing all available attributes. All private store
> attributes are excluded. Please note that of all attributes only custom attributes
> will be writeable.

*item:* store.item
> A valid file.store item.

*********************************************
#### getFeatures() ####
> The getFeatures() method returns an simple JavaScript "keyword:value" object that specifies
> what interface features the datastore implements.

*********************************************
#### getIdentity( item ) ####
> Returns a unique identifier for an item. The default identifier for the File Store 
> is the attribute *path* unless otherwise specified by the back-end server. The return
> value will be either a string or something that has a toString() method.

*item:* store.item
> A valid file.store item.

#### getIdentityAttributes( item ) ####
> Returns an array of attribute names that holds an items identity. By default, the File Store
> only supports one attribute: *path*.

*item:* store.item
> A valid file.store item.

*********************************************
#### getLabel( item ) ####
> Inspect the item and return a user-readable 'label' for the item that provides
> a general/adequate description of what the item is. By default the *name* 
> property of the item is used unless otherwise specified by the back-end server.

*item:* store.item
> A valid file.store item.

*********************************************
#### getLabelAttributes( item ) ####
> Return the label attributes of the store as an array of strings. By default, the File Store 
> only supports one label attribute: *name* unless otherwise specified by the back-end server.

*item:* store.item
> A valid file.store item.

*********************************************
#### getParents( item ) ####
> Get the parent(s) of a store item. Returns an array of store items. By default, 
> File Store items have one parent.

*item:* store.item
> A valid file.store item.

*********************************************
#### getValue( item, attribute, defaultValue ) ####
> Returns the value of the items property identified by parameter *attribute*. 
> The result is always returned as a single item therefore if the store value
> is an array the item at index 0 is returned.

*item:* store.item
> A valid file.store item.

*attribute:* String
> The name of an item attribute/property whose value to return.

*********************************************
#### getValues( item, attribute ) ####
> Returns the values of the items property identified by parameter *attribute*. 
> The result is always returned as an array.

*item:* store.item
> A valid file.store item.

*attribute:* String
> The name of an item attribute/property whose value to return.

*********************************************
#### hasAttribute( item, attribute ) ####

*item:* store.item
> A valid file.store item.

*attribute:* String
> The name of an item attribute/property.

*********************************************
#### isItem( something ) ####
> Returns true if *something* is an item and came from the store instance. Returns
> false if *something* is a literal, an item from another store instance, or is any
> object other than an item.

*something:*
> Can be anything.

*********************************************
#### isItemLoaded( item ) ####
> Returns true if *item* is loaded into the store otherwise false.

*item:* store.item
> A valid file.store item.

*********************************************
#### isRootItem( item ) ####
> Returns true if *item* is a top-level item in the store otherwise false.

*item:* store.item
> A valid file.store item.

*********************************************
#### loadItem( keywordArgs ) ####
> Given an item, this method loads the item so that a subsequent call to isItemLoaded(item)
> will return true.

*keywordArgs:*
> An anonymous object that defines the item to load and callbacks to invoke when the
> load has completed.  The format of the object is as follows:
> { *item*: object, *onItem*: Function, *onError*: Function, *scope*: object }   
> (See dojo.data.api.Read.loadItem for additional details).

*********************************************
#### setValue( item, attribute, newValue ) ####
> Assign a new value to the items attribute/property.

*item:* store.item
> A valid file.store item.

*attribute:* String
> The name of the item attribute/property whose value is to be set.

*newValue:* AnyType
> The new values to be assigned to the attribute/property.

*********************************************
#### setValues( item, attribute, newValues ) ####
> Assign an array of new values to the items attribute/property. The parameter
> *newValues* must be an array otherwise an error is thrown.

*item:* store.item
> A valid file.store item.

*attribute:* String
> The name of the item attribute/property whose value is to be set.

*newValues:* AnyType[]
> Array of new values to be assigned to the attribute/property. If *newValues* is an empty array
> setValues() act the same as unsetAttribute.

*********************************************
#### unsetAttribute: function ( item, attribute ) ####
Unset an items attribute/property. Unsetting an attribute will remove the attribute from the item.

*item:* store.item
> A valid file.store item.

*attribute:* String
> The name of the items attribute/property to be unset


<h2 id="file-store-callbacks">File Store Callbacks</h2>

#### onDelete( deletedItem ) ####

*deleteItem:* store.item
> A valid file.store item.

#### onLoaded() ####

#### onNew( newItem, parentInfo) ####

#### onSet( item, atribute, oldValue, newValue ) ####


<h2 id="file-store-sample">Sample Application</h2>

The following sample application shows the document root directory of the back-end server
as a simple tree with checkboxes. Notice that because the model property *checkedStrict* 
is disabled the FileStoreModel will automatically apply lazy loading.

	<!DOCTYPE html>
	<html>
	  <head> 
		<title>Dijit CheckBox Tree and File Store</title>     
		<style type="text/css">
		  @import "../../dijit/themes/claro/claro.css";
		  @import "../themes/claro/claro.css";
		</style>

		<script type="text/javascript">
		  var dojoConfig = {
				async: true,
				parseOnLoad: true,
				isDebug: true,
				baseUrl: "../../",
				packages: [
				  { name: "dojo",  location: "dojo" },
				  { name: "dijit", location: "dijit" },
				  { name: "cbtree",location: "cbtree" }
				]
		  };
		</script>
		<script type="text/javascript" src="../../dojo/dojo.js"></script> 
	  </head>
		
	  <body class="claro">
		<div id="CheckboxTree">  
		  <script type="text/javascript">
			require([
			  "cbtree/Tree",                  // Checkbox tree
			  "cbtree/models/FileStoreModel", // FileStoreModel
			  "cbtree/stores/FileStore"
			  ], function( Tree, FileStoreModel, FileStore) {
				  var store = new FileStore( { url: "../stores/server/php/cbtreeFileStore.php", basePath:"./"} ); 
				  var model = new FileStoreModel( {
						  store: store,
						  rootLabel: 'My HTTP Document Root',
						  checkedRoot: true,
						  checkedStrict: false,
						  sort: [{attribute:"directory", descending:true},{attribute:"name"}]
					   }); 
				  var tree = new Tree( { model: model, id: "MenuTree" });
				  tree.placeAt( "CheckboxTree" );
			});
		  </script>
		</div>
	  </body> 
	</html>


### Fancy Tree Styling ###

The following sample applies *Fancy Icons* to the tree 

	<!DOCTYPE html>
	<html>
	  <head> 
		<title>Dijit CheckBox Tree and File Store</title>     
		<!-- 	
			Load the CSS files including the Apache style icons, alternatively load fileIconsMS.css 
			instead to get Microsoft Windows style icons (but not both).
		-->
		<style type="text/css">
		  @import "../../dijit/themes/claro/claro.css";
		  @import "../themes/claro/claro.css";
		  @import "../icons/fileIconsApache.css";
		</style>

		<script type="text/javascript">
		  var dojoConfig = {
				async: true,
				parseOnLoad: true,
				isDebug: true,
				baseUrl: "../../",
				packages: [
				  { name: "dojo",  location: "dojo" },
				  { name: "dijit", location: "dijit" },
				  { name: "cbtree",location: "cbtree" }
				]
		  };
		</script>
		<script type="text/javascript" src="../../dojo/dojo.js"></script> 
	  </head>
		
	  <body class="claro">
		<div id="CheckboxTree">  
		  <script type="text/javascript">

		  require([
			"cbtree/Tree",                  // Checkbox tree
			"cbtree/TreeStyling",           // Checkbox tree Styling
			"cbtree/models/FileStoreModel", // FileStoreModel
			"cbtree/stores/FileStore"
			], function( Tree, TreeStyling, FileStoreModel, FileStore) {

			  // The option 'iconClass' forces the server side application to include the icon classname
			  // in the response.
			  var store = new FileStore( { url: "../stores/server/php/cbtreeFileStore.php", 
										   basePath:"./",
										   options:["iconClass"] } ); 

			  // Tell the model to look for the store item property 'icon' and process it as an icon.
			  var model = new FileStoreModel( {
					  store: store,
					  rootLabel: 'My HTTP Document Root',
					  checkedRoot: true,
					  checkedStrict: false,
					  iconAttr: "icon",
					  sort: [{attribute:"directory", descending:true},{attribute:"name"}]
				   }); 

			  // Create the tree and set the icon property so the tree root uses the same set of icons
			  // all tree nodes will use (not required but for consistancy only).
			  var tree = new Tree( { model: model, id: "MenuTree",
									 icon: {iconClass:"fileIcon"}
								   });
			  tree.placeAt( "CheckboxTree" );
			});
		  </script>
		</div>
	  </body> 
	</html>