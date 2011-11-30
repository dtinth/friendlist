fql = (query, response) ->
	FB.api {
		method: 'fql.query'
		query:  query
	}, response

# base component

class Component

	proxy: (name) ->
		return =>
			this[name] arguments...

	handlerID = 1

	listen: (name, fn) ->
		if not fn.handlerID?
			fn.handlerID = handlerID++
		if not @events?
			@events = {}
		if not @events[name]?
			@events[name] = {}
		@events[name][fn.handlerID] = fn
	
	ignore: (name, fn) ->
		if @events? and @events[name]? and fn.handlerID?
			delete @events[name][fn.handlerID]
	
	fire: (name, args...) ->
		if @events? and @events[name]?
			for i of @events[name]
				@events[name][i] args...

class Table extends Component

	constructor: ->
		@data = {}
		@length = 0
	
	set: (key, node) ->
		if not (key of @data)
			@length++
		@data[key] = node

	add: (node) ->
		@set node.key, node

	get: (key) ->
		if key instanceof Node
			key = key.key
		return @data[key]
	
	delete: (key) ->
		if key instanceof Node
			key = key.key
		if key of @data
			@length--
			delete @data[key]

class Node extends Component

	constructor: (@key, @data) ->
		@friends = new Table
		@lists   = new Table
		@groups  = new Table
		@sortKey = @data.name.toLowerCase()

	@compare: (a, b) ->
		if a.sortKey == b.sortKey
			return 0
		return if a.sortKey < b.sortKey then -1 else 1

	connect: (node) ->
		if node instanceof Friend
			@friends.add node
		else if node instanceof FriendList
			@lists.add node
		else if node instanceof Group
			@groups.add node

class Friend     extends Node
class FriendList extends Node
class Group      extends Node

class Database extends Component

	constructor: ->
		@friends = new Table
		@lists   = new Table
		@groups  = new Table

class DataLoader extends Component

	LOAD_CHAIN = []
	DEBUG_CACHE = false

	class Proc extends Component
		constructor: (@db) ->
		load: ->
			@fire 'status', @status

	class QueryProc extends Proc
		load: ->
			super()
			if DEBUG_CACHE
				if sessionStorage.getItem(@query) not in ["", null]
					try
						data = JSON.parse(sessionStorage.getItem(@query))
					if data
						setTimeout (=>
							@handleResults data), 100
						return
			fql @query, @proxy('handleResults')
		handleResults: (results) ->
			if DEBUG_CACHE
				sessionStorage.setItem(@query, JSON.stringify(results))
			for row in results
				@handleRow row
			@fire 'finish'

	class LoadProc extends QueryProc
		handleRow: (row) ->
			type = @type
			@db[@table].add(new type(row[@key], row))

	LOAD_CHAIN.push class FriendsLoadProc extends LoadProc
		status: 'Loading Friends'
		query: """
			SELECT uid, name, pic_square, profile_url
			FROM user
			WHERE uid IN (SELECT uid1 FROM friend WHERE uid2 = me())"""
		key: 'uid'
		table: 'friends'
		type: Friend
	
	LOAD_CHAIN.push class ListsLoadProc extends LoadProc
		status: 'Loading Friend Lists'
		query: """
			SELECT flid, name
			FROM friendlist
			WHERE owner=me()"""
		key: 'flid'
		table: 'lists'
		type: FriendList
	
	LOAD_CHAIN.push class GroupsLoadProc extends LoadProc
		status: 'Loading Groups'
		query: """
			SELECT gid, name
			FROM group
			WHERE gid IN (SELECT gid FROM group_member WHERE uid = me()) AND version > 0"""
		key: 'gid'
		table: 'groups'
		type: Group
	
	LOAD_CHAIN.push class FriendshipQueryProc extends QueryProc
		status: 'Querying Friendship'
		query: """
			SELECT uid1, uid2
			FROM friend
			WHERE uid1 < uid2
    			AND uid1 IN (SELECT uid1 FROM friend WHERE uid2 = me())
    			AND uid2 IN (SELECT uid1 FROM friend WHERE uid2 = me())"""
		handleRow: (row) ->
			a = @db.friends.get(row.uid1)
			b = @db.friends.get(row.uid2)
			if a and b
				a.connect b
				b.connect a
	
	LOAD_CHAIN.push class ListMemberProc extends QueryProc
		status: 'Querying List Members'
		query: """
			SELECT flid, uid
			FROM friendlist_member
			WHERE flid IN (SELECT flid FROM friendlist WHERE owner=me())
			"""
		handleRow: (row) ->
			u = @db.friends.get(row.uid)
			l = @db.lists.get(row.flid)
			if u and l
				u.connect l
				l.connect u

	LOAD_CHAIN.push class GroupMemberProc extends QueryProc
		status: 'Querying Group Members'
		query: """
			SELECT uid, gid
			FROM group_member
			WHERE uid IN (SELECT uid1 FROM friend WHERE uid2 = me())
				AND gid IN (SELECT gid FROM group WHERE gid IN (SELECT gid FROM group_member WHERE uid = me()) AND version > 0)
			"""
		handleRow: (row) ->
			u = @db.friends.get(row.uid)
			g = @db.groups.get(row.gid)
			if u and g
				u.connect g
				g.connect u

	constructor: (@db) ->
		@next = 0

	load: ->
		@loadNext()

	loadNext: ->
		if @next >= LOAD_CHAIN.length
			@fire 'finish'
			return
		current = LOAD_CHAIN[@next]
		@next++
		proc = new current(@db)
		proc.listen 'status', (message) => @fire 'status', message
		proc.listen 'finish', @proxy('loadNext')
		proc.load()

class LoadProgressView extends Component

	constructor: (title) ->
		@element = $ '<div class="loading"><b>' + title + ':</b> <span class="message"></span></div>'
		@message = @element.find '.message'
		@element.appendTo document.body

	status: (message) ->
		@message.html message
	
	finish: ->
		@element.remove()


class ListBox extends Component

	constructor: (title, className) ->
		@element = $ """
			<div class="listbox #{className}">
				<h2>#{title}</h2>
				<div class="listbox-contents"></div>
			</div>
		"""
		@element.appendTo document.body
		@element.click @proxy('click')
		@element.keypress @proxy('keypress')
		@contents = @element.find '.listbox-contents'
		@items = []

	click: (e) ->
		closest = $(e.target).closest('[data-index]')
		if closest.length > 0
			@action parseInt(closest.data('index'), 10)

	keypress: (e) ->
		if e.which == 13 or e.which == 32
			@click(e)

	action: (index) ->
		@items[index].action()

	render: ->
		html = ""
		index = 0
		for item in @items
			html += """
				<div tabindex="0" class="list-item-container" data-index="#{index}">#{item.render()}</div>
			"""
			index++
		return html
	
	update: ->
		@contents.html @render()

class ListBoxWithTitle extends ListBox
	
	constructor: ->
		super(arguments...)
		@countEl = $('<span class="count"></span>').appendTo(@element.find 'h2')
	
	update: ->
		super()
		@countEl.html ' (' + @items.length + ')'

class ListItem extends Component

	action: ->
		@fire 'action'

class FilterItem extends ListItem

	nextFilterID = 1

	constructor: (@filter) ->
		@id = nextFilterID++
		@checked = true
	
	render: ->
		"""
			<div class="list-item filter-item#{if @checked then " checked" else ""}" data-filter="#{@id}">
				#{@renderContents()}
			</div>
		"""
	
	setChecked: (checked) ->
		@checked = checked
		$('[data-filter="' + @id + '"]').parent().html => @render()

	action: ->
		@setChecked not @checked
		@filter.updateSelectAll()
		@filter.fire 'change'
		super()

class SelectFilterItem extends FilterItem

	constructor: (filter, @node) ->
		super(filter)
	
	renderContents: -> @node.data.name

	check: (node) ->
		return @checked and (node[@filter.type].get(@node)?)

class NotInAnyFilterItem extends FilterItem

	renderContents: -> "Not in any #{@filter.name}"
	
	check: (node) ->
		return @checked and (node[@filter.type].length == 0)

class CheckOption extends Component

	constructor: (@filter, @text, @checked = false) ->
		@element = $ """
			<div tabindex="0" class="check-option#{if @checked then " checked" else ""}">#{@text}</div>
		"""
		@element.click @proxy('action')
		@element.keypress @proxy('keypress')
		@element.appendTo @filter.options

	setChecked: (checked) ->
		@checked = checked
		if checked then @element.addClass 'checked' else @element.removeClass 'checked'

	keypress: (e) ->
		if e.which == 13 or e.which == 32
			@action()

	action: ->
		@setChecked not @checked
		@fire 'action'

class Filter extends ListBox
	
	constructor: (@type, table, @name, className) ->
		super(@name, 'filter ' + className)
		@createListItems(table)
		@createOptions()
		@updateSelectAll()
		@update()

	createOptions: ->
		@options = $ """
			<div class="filter-options"></div>
		"""
		@selectall = new CheckOption(@, 'Select All',       false)
		@negate    = new CheckOption(@, 'Negate Selection', false)
		@selectall.listen 'action', => @selectDeselectAll(); @fire('change')
		@negate.listen    'action', => @fire('change')
		@options.appendTo @element
	
	selectDeselectAll: ->
		for item in @items
			item.setChecked @selectall.checked

	updateSelectAll: ->
		all = true
		for item in @items
			if not item.checked
				all = false
				break
		@selectall.setChecked all

	createListItems: (table) ->
		list = (table.data[key] for key of table.data)
		list.sort Node.compare
		@items = (new SelectFilterItem(@, node) for node in list)
		@items.push new NotInAnyFilterItem(@)

	checkNode: (node) ->
		if @selectall.checked
			return true
		for item in @items
			if item.check node
				return true
		return false

	check: (node) ->
		if @checkNode(node)
			return if @negate.checked then false else true
		return if @negate.checked then true else false

class FriendItem extends ListItem

	constructor: (@app, @node) ->

	render: ->
		"""
			<div data-friend="#{@node.key}" class="list-item friend-item#{if @node == @app.selectedFriend then " selected" else ""}">
				<table cellpadding="0" cellspacing="0">
					<tr>
						<td>
							<a href="#{@node.data.profile_url}"><img alt="(Profile Picture)" width="44" height="44" src="#{@node.data.pic_square}"></a>
						</td>
						<td class="name">#{@node.data.name}#{@groups()}</td>
					</tr>
				</table>
			</div>
		"""
	
	groups: ->
		groups = (@node.groups.data[key] for key of @node.groups.data)
		if groups.length == 0
			return ""
		return """
			<span class="grouplist"> #{("<span class=\"group\">#{group.data.name}</span>" for group in groups).join(', ')}</span>
		"""

	action: ->
		@app.selectFriend @node

class ListModifyProc extends Component

	active = {}

	setActive = (friend, list, flag) ->
		active[friend.key + ':' + list.key] = flag
	
	@isActive: (friend, list) ->
		return not not active[friend.key + ':' + list.key]

	constructor: (@app, @list, @friend, @mode) ->
		setActive @friend, @list, true
		path = @list.key + '/members/' + @friend.key
		if @mode
			@friend.lists.add(@list)
			@list.friends.add(@friend)
			method = 'post'
		else
			@friend.lists.delete(@list)
			@list.friends.delete(@friend)
			method = 'delete'
		@updateElements()
		FB.api path, method, @proxy('finish')
	
	updateElements: ->
		$('[data-friend="' + @friend.key + '"][data-fl="' + @list.key + '"]').parent().html => new FriendListItem(@app, @list).render()
	
	finish: (response) ->
		setActive @friend, @list, false
		if not response
			# undo
			if @mode
				@friend.lists.delete(@list)
				@list.friends.delete(@friend)
			else
				@friend.lists.add(@list)
				@list.friends.add(@friend)
		@updateElements()


class FriendListItem extends ListItem

	constructor: (@app, @node) ->

	disabled: -> not @app.selectedFriend or ListModifyProc.isActive(@app.selectedFriend, @node)

	checked: -> @app.selectedFriend and @app.selectedFriend.lists.get(@node)

	render: ->
		addClass = ""
		addClass += " disabled" if @disabled()
		addClass += " checked" if @checked()
		[score, majority] = @getScore()
		"""
			<div data-friend="#{if @app.selectedFriend then @app.selectedFriend.key else "NA"}" data-fl="#{@node.key}" class="list-item fl-item#{addClass}#{if majority then " major" else ""}">
				<span class="score">#{score}</span><span class="name">#{@node.data.name}</span>
			</div>
		"""
	
	getScore: ->
		if not @app.selectedFriend
			return ["", false]
		score = 0
		if @node.key of @app.listScore
			score = @app.listScore[@node.key]
		if score == 0
			return ["", false]
		return [
			"""#{score}"""
			score > @app.maxScore / 2
		]
	
	action: ->
		if not @disabled()
			proc = new ListModifyProc(@app, @node, @app.selectedFriend, not @checked())

class Application extends Component

	constructor: ->
		@db        = new Database
		@listScore = {}
		@maxScore  = 0

	run: ->
		loader   = new DataLoader(@db)
		progress = new LoadProgressView('Loading')
		loader.listen 'status', progress.proxy('status')
		loader.listen 'finish', progress.proxy('finish')
		loader.listen 'finish', @proxy('loaded')
		loader.load()
	
	loaded: ->
		@prepareFilters()
		@createFriendList()
		@createAssignList()
		@filter()

	prepareFilters: ->
		@listFilter   = new Filter('lists',  @db.lists,  "List",  'list-filter')
		@groupFilter  = new Filter('groups', @db.groups, "Group", 'group-filter')
		@listFilter.listen  'change', @proxy('filter')
		@groupFilter.listen 'change', @proxy('filter')

	createFriendList: ->
		@friendList = new ListBoxWithTitle("Friends", 'friends')
		@friends = (@db.friends.data[key] for key of @db.friends.data)
		@friends.sort Node.compare

	createAssignList: ->
		@assignList = new ListBox("Assign To Group", 'assign')
		@lists = (@db.lists.data[key] for key of @db.lists.data)
		@lists.sort Node.compare
		@assignList.items = (new FriendListItem(@, node) for node in @lists)
		@assignList.update()

	filter: ->
		friends = (node for node in @friends when @listFilter.check(node) and @groupFilter.check(node))
		@friendList.items = (new FriendItem(@, node) for node in friends)
		@friendList.update()
		if not (@selectedFriend in friends)
			@selectFriend undefined

	updateFriend: (node) ->
		if node
			$('[data-friend="' + node.key + '"]').parent().html => new FriendItem(@, node).render()

	selectFriend: (node) ->
		oldSelectedFriend = @selectedFriend
		@selectedFriend = node
		@updateFriend(oldSelectedFriend)
		@calculateMutualFriendLists()
		@updateFriend(@selectedFriend)
		@assignList.update()
	
	calculateMutualFriendLists: ->
		node = @selectedFriend
		if not node
			return
		@listScore = {}
		@maxScore  = 0
		friends = node.friends
		for key of friends.data
			friend = friends.data[key]
			for flkey of friend.lists.data
				if not (flkey of @listScore)
					@listScore[flkey] = 0
				@listScore[flkey]++
				if @listScore[flkey] > @maxScore
					@maxScore = @listScore[flkey]


REQUIRED_PERMISSIONS = 'user_groups,friends_groups,read_friendlists,manage_friendlists,user_checkins,friends_checkins'

class Login extends Component

	constructor: (@callback, message, @onclick) ->
		@element = $('<div id="login"><a href="javascript://"></a></div>')
		@link = @element.find 'a'
		@link.html message
		@link.click @proxy('login')
		@element.appendTo document.body

	login: ->
		@element.remove()
		@onclick()
		FB.login @callback, { perms: REQUIRED_PERMISSIONS }

class Bootstrapper extends Component

	constructor: ->
		@initprogress = new LoadProgressView('Initializing')
		@initprogress.status 'Getting Facebook Session'
		FB.getLoginStatus @proxy('gotSession')
	
	gotSession: (response) ->
		if @initprogress
			@initprogress.finish()
			delete @initprogress
		if response.session
			if @checkPermission response.perms
				@initializeApp()
			else
				@showLogin "Set Permissions"
		else
			@showLogin "Connect with Facebook"
	
	checkPermission: (perms) ->
		required = REQUIRED_PERMISSIONS.split ','
		available = perms.split ','
		if not available?
			return true
		for perm in required
			if not (perm in available)
				return false
		return true

	initializeApp: ->
		app = new Application
		window.app = app
		app.run()

	displayNext: ->
		if not @initprogress
			@initprogress = new LoadProgressView('Waiting')
		@initprogress.status 'Waiting for session from Facebook.<br><br>If it doesn\'t continue, please refresh this page.'

	showLogin: (message) ->
		new Login(@proxy('gotSession'), message, @proxy('displayNext'))

class AccessibilityHelper extends Component

	constructor: ->
		$(window).keydown @proxy('keydown')

	keydown: (e) ->
		target = $(e.target)
		if e.which == 38
			target.closest('.list-item-container').prev('.list-item-container').each -> @focus()
			return false
		else if e.which == 40
			target.closest('.list-item-container').next('.list-item-container').each -> @focus()
			return false
		else if e.which == 37
			target.closest('.listbox').prev('.listbox').find('.list-item-container').eq(0).each -> @focus()
			return false
		else if e.which == 39
			target.closest('.listbox').next('.listbox').find('.list-item-container').eq(0).each -> @focus()
			return false
			

$ ->
	new AccessibilityHelper
	new Bootstrapper

