(function() {
  var AccessibilityHelper, Application, Bootstrapper, CheckOption, Component, DataLoader, Database, Filter, FilterItem, Friend, FriendItem, FriendList, FriendListItem, Group, ListBox, ListBoxWithTitle, ListItem, ListModifyProc, LoadProgressView, Login, Node, NotInAnyFilterItem, REQUIRED_PERMISSIONS, SelectFilterItem, Table, fql;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }, __slice = Array.prototype.slice, __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (this[i] === item) return i;
    }
    return -1;
  };
  fql = function(query, response) {
    return FB.api({
      method: 'fql.query',
      query: query
    }, response);
  };
  Component = (function() {
    var handlerID;
    function Component() {}
    Component.prototype.proxy = function(name) {
      return __bind(function() {
        return this[name].apply(this, arguments);
      }, this);
    };
    handlerID = 1;
    Component.prototype.listen = function(name, fn) {
      if (!(fn.handlerID != null)) {
        fn.handlerID = handlerID++;
      }
      if (!(this.events != null)) {
        this.events = {};
      }
      if (!(this.events[name] != null)) {
        this.events[name] = {};
      }
      return this.events[name][fn.handlerID] = fn;
    };
    Component.prototype.ignore = function(name, fn) {
      if ((this.events != null) && (this.events[name] != null) && (fn.handlerID != null)) {
        return delete this.events[name][fn.handlerID];
      }
    };
    Component.prototype.fire = function() {
      var args, i, name, _ref, _results;
      name = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if ((this.events != null) && (this.events[name] != null)) {
        _results = [];
        for (i in this.events[name]) {
          _results.push((_ref = this.events[name])[i].apply(_ref, args));
        }
        return _results;
      }
    };
    return Component;
  })();
  Table = (function() {
    __extends(Table, Component);
    function Table() {
      this.data = {};
      this.length = 0;
    }
    Table.prototype.set = function(key, node) {
      if (!(key in this.data)) {
        this.length++;
      }
      return this.data[key] = node;
    };
    Table.prototype.add = function(node) {
      return this.set(node.key, node);
    };
    Table.prototype.get = function(key) {
      if (key instanceof Node) {
        key = key.key;
      }
      return this.data[key];
    };
    Table.prototype["delete"] = function(key) {
      if (key instanceof Node) {
        key = key.key;
      }
      if (key in this.data) {
        this.length--;
        return delete this.data[key];
      }
    };
    return Table;
  })();
  Node = (function() {
    __extends(Node, Component);
    function Node(key, data) {
      this.key = key;
      this.data = data;
      this.friends = new Table;
      this.lists = new Table;
      this.groups = new Table;
      this.sortKey = this.data.name.toLowerCase();
    }
    Node.compare = function(a, b) {
      if (a.sortKey === b.sortKey) {
        return 0;
      }
      if (a.sortKey < b.sortKey) {
        return -1;
      } else {
        return 1;
      }
    };
    Node.prototype.connect = function(node) {
      if (node instanceof Friend) {
        return this.friends.add(node);
      } else if (node instanceof FriendList) {
        return this.lists.add(node);
      } else if (node instanceof Group) {
        return this.groups.add(node);
      }
    };
    return Node;
  })();
  Friend = (function() {
    function Friend() {
      Friend.__super__.constructor.apply(this, arguments);
    }
    __extends(Friend, Node);
    return Friend;
  })();
  FriendList = (function() {
    function FriendList() {
      FriendList.__super__.constructor.apply(this, arguments);
    }
    __extends(FriendList, Node);
    return FriendList;
  })();
  Group = (function() {
    function Group() {
      Group.__super__.constructor.apply(this, arguments);
    }
    __extends(Group, Node);
    return Group;
  })();
  Database = (function() {
    __extends(Database, Component);
    function Database() {
      this.friends = new Table;
      this.lists = new Table;
      this.groups = new Table;
    }
    return Database;
  })();
  DataLoader = (function() {
    var DEBUG_CACHE, FriendsLoadProc, FriendshipQueryProc, GroupMemberProc, GroupsLoadProc, LOAD_CHAIN, ListMemberProc, ListsLoadProc, LoadProc, Proc, QueryProc;
    __extends(DataLoader, Component);
    LOAD_CHAIN = [];
    DEBUG_CACHE = false;
    Proc = (function() {
      __extends(Proc, Component);
      function Proc(db) {
        this.db = db;
      }
      Proc.prototype.load = function() {
        return this.fire('status', this.status);
      };
      return Proc;
    })();
    QueryProc = (function() {
      function QueryProc() {
        QueryProc.__super__.constructor.apply(this, arguments);
      }
      __extends(QueryProc, Proc);
      QueryProc.prototype.load = function() {
        var data, _ref;
        QueryProc.__super__.load.call(this);
        if (DEBUG_CACHE) {
          if ((_ref = sessionStorage.getItem(this.query)) !== "" && _ref !== null) {
            try {
              data = JSON.parse(sessionStorage.getItem(this.query));
            } catch (_e) {}
            if (data) {
              setTimeout((__bind(function() {
                return this.handleResults(data);
              }, this)), 100);
              return;
            }
          }
        }
        return fql(this.query, this.proxy('handleResults'));
      };
      QueryProc.prototype.handleResults = function(results) {
        var row, _i, _len;
        if (DEBUG_CACHE) {
          sessionStorage.setItem(this.query, JSON.stringify(results));
        }
        for (_i = 0, _len = results.length; _i < _len; _i++) {
          row = results[_i];
          this.handleRow(row);
        }
        return this.fire('finish');
      };
      return QueryProc;
    })();
    LoadProc = (function() {
      function LoadProc() {
        LoadProc.__super__.constructor.apply(this, arguments);
      }
      __extends(LoadProc, QueryProc);
      LoadProc.prototype.handleRow = function(row) {
        var type;
        type = this.type;
        return this.db[this.table].add(new type(row[this.key], row));
      };
      return LoadProc;
    })();
    LOAD_CHAIN.push(FriendsLoadProc = (function() {
      function FriendsLoadProc() {
        FriendsLoadProc.__super__.constructor.apply(this, arguments);
      }
      __extends(FriendsLoadProc, LoadProc);
      FriendsLoadProc.prototype.status = 'Loading Friends';
      FriendsLoadProc.prototype.query = "SELECT uid, name, pic_square, profile_url\nFROM user\nWHERE uid IN (SELECT uid1 FROM friend WHERE uid2 = me())";
      FriendsLoadProc.prototype.key = 'uid';
      FriendsLoadProc.prototype.table = 'friends';
      FriendsLoadProc.prototype.type = Friend;
      return FriendsLoadProc;
    })());
    LOAD_CHAIN.push(ListsLoadProc = (function() {
      function ListsLoadProc() {
        ListsLoadProc.__super__.constructor.apply(this, arguments);
      }
      __extends(ListsLoadProc, LoadProc);
      ListsLoadProc.prototype.status = 'Loading Friend Lists';
      ListsLoadProc.prototype.query = "SELECT flid, name\nFROM friendlist\nWHERE owner=me()";
      ListsLoadProc.prototype.key = 'flid';
      ListsLoadProc.prototype.table = 'lists';
      ListsLoadProc.prototype.type = FriendList;
      return ListsLoadProc;
    })());
    LOAD_CHAIN.push(GroupsLoadProc = (function() {
      function GroupsLoadProc() {
        GroupsLoadProc.__super__.constructor.apply(this, arguments);
      }
      __extends(GroupsLoadProc, LoadProc);
      GroupsLoadProc.prototype.status = 'Loading Groups';
      GroupsLoadProc.prototype.query = "SELECT gid, name\nFROM group\nWHERE gid IN (SELECT gid FROM group_member WHERE uid = me()) AND version > 0";
      GroupsLoadProc.prototype.key = 'gid';
      GroupsLoadProc.prototype.table = 'groups';
      GroupsLoadProc.prototype.type = Group;
      return GroupsLoadProc;
    })());
    LOAD_CHAIN.push(FriendshipQueryProc = (function() {
      function FriendshipQueryProc() {
        FriendshipQueryProc.__super__.constructor.apply(this, arguments);
      }
      __extends(FriendshipQueryProc, QueryProc);
      FriendshipQueryProc.prototype.status = 'Querying Friendship';
      FriendshipQueryProc.prototype.query = "SELECT uid1, uid2\nFROM friend\nWHERE uid1 < uid2\n    			AND uid1 IN (SELECT uid1 FROM friend WHERE uid2 = me())\n    			AND uid2 IN (SELECT uid1 FROM friend WHERE uid2 = me())";
      FriendshipQueryProc.prototype.handleRow = function(row) {
        var a, b;
        a = this.db.friends.get(row.uid1);
        b = this.db.friends.get(row.uid2);
        if (a && b) {
          a.connect(b);
          return b.connect(a);
        }
      };
      return FriendshipQueryProc;
    })());
    LOAD_CHAIN.push(ListMemberProc = (function() {
      function ListMemberProc() {
        ListMemberProc.__super__.constructor.apply(this, arguments);
      }
      __extends(ListMemberProc, QueryProc);
      ListMemberProc.prototype.status = 'Querying List Members';
      ListMemberProc.prototype.query = "SELECT flid, uid\nFROM friendlist_member\nWHERE flid IN (SELECT flid FROM friendlist WHERE owner=me())";
      ListMemberProc.prototype.handleRow = function(row) {
        var l, u;
        u = this.db.friends.get(row.uid);
        l = this.db.lists.get(row.flid);
        if (u && l) {
          u.connect(l);
          return l.connect(u);
        }
      };
      return ListMemberProc;
    })());
    LOAD_CHAIN.push(GroupMemberProc = (function() {
      function GroupMemberProc() {
        GroupMemberProc.__super__.constructor.apply(this, arguments);
      }
      __extends(GroupMemberProc, QueryProc);
      GroupMemberProc.prototype.status = 'Querying Group Members';
      GroupMemberProc.prototype.query = "SELECT uid, gid\nFROM group_member\nWHERE uid IN (SELECT uid1 FROM friend WHERE uid2 = me())\n	AND gid IN (SELECT gid FROM group WHERE gid IN (SELECT gid FROM group_member WHERE uid = me()) AND version > 0)";
      GroupMemberProc.prototype.handleRow = function(row) {
        var g, u;
        u = this.db.friends.get(row.uid);
        g = this.db.groups.get(row.gid);
        if (u && g) {
          u.connect(g);
          return g.connect(u);
        }
      };
      return GroupMemberProc;
    })());
    function DataLoader(db) {
      this.db = db;
      this.next = 0;
    }
    DataLoader.prototype.load = function() {
      return this.loadNext();
    };
    DataLoader.prototype.loadNext = function() {
      var current, proc;
      if (this.next >= LOAD_CHAIN.length) {
        this.fire('finish');
        return;
      }
      current = LOAD_CHAIN[this.next];
      this.next++;
      proc = new current(this.db);
      proc.listen('status', __bind(function(message) {
        return this.fire('status', message);
      }, this));
      proc.listen('finish', this.proxy('loadNext'));
      return proc.load();
    };
    return DataLoader;
  })();
  LoadProgressView = (function() {
    __extends(LoadProgressView, Component);
    function LoadProgressView(loader) {
      this.loader = loader;
      this.element = $('<div class="loading"><div class="message"></div></div>');
      this.message = this.element.find('.message');
      this.loader.listen('status', this.proxy('status'));
      this.loader.listen('finish', this.proxy('finish'));
      this.element.appendTo(document.body);
    }
    LoadProgressView.prototype.status = function(message) {
      return this.message.html(message);
    };
    LoadProgressView.prototype.finish = function() {
      return this.element.remove();
    };
    return LoadProgressView;
  })();
  ListBox = (function() {
    __extends(ListBox, Component);
    function ListBox(title, className) {
      this.element = $("<div class=\"listbox " + className + "\">\n	<h2>" + title + "</h2>\n	<div class=\"listbox-contents\"></div>\n</div>");
      this.element.appendTo(document.body);
      this.element.click(this.proxy('click'));
      this.element.keypress(this.proxy('keypress'));
      this.contents = this.element.find('.listbox-contents');
      this.items = [];
    }
    ListBox.prototype.click = function(e) {
      var closest;
      closest = $(e.target).closest('[data-index]');
      if (closest.length > 0) {
        return this.action(parseInt(closest.data('index'), 10));
      }
    };
    ListBox.prototype.keypress = function(e) {
      if (e.which === 13 || e.which === 32) {
        return this.click(e);
      }
    };
    ListBox.prototype.action = function(index) {
      return this.items[index].action();
    };
    ListBox.prototype.render = function() {
      var html, index, item, _i, _len, _ref;
      html = "";
      index = 0;
      _ref = this.items;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        html += "<div tabindex=\"0\" class=\"list-item-container\" data-index=\"" + index + "\">" + (item.render()) + "</div>";
        index++;
      }
      return html;
    };
    ListBox.prototype.update = function() {
      return this.contents.html(this.render());
    };
    return ListBox;
  })();
  ListBoxWithTitle = (function() {
    __extends(ListBoxWithTitle, ListBox);
    function ListBoxWithTitle() {
      ListBoxWithTitle.__super__.constructor.apply(this, arguments);
      this.countEl = $('<span class="count"></span>').appendTo(this.element.find('h2'));
    }
    ListBoxWithTitle.prototype.update = function() {
      ListBoxWithTitle.__super__.update.call(this);
      return this.countEl.html(' (' + this.items.length + ')');
    };
    return ListBoxWithTitle;
  })();
  ListItem = (function() {
    function ListItem() {
      ListItem.__super__.constructor.apply(this, arguments);
    }
    __extends(ListItem, Component);
    ListItem.prototype.action = function() {
      return this.fire('action');
    };
    return ListItem;
  })();
  FilterItem = (function() {
    var nextFilterID;
    __extends(FilterItem, ListItem);
    nextFilterID = 1;
    function FilterItem(filter) {
      this.filter = filter;
      this.id = nextFilterID++;
      this.checked = true;
    }
    FilterItem.prototype.render = function() {
      return "<div class=\"list-item filter-item" + (this.checked ? " checked" : "") + "\" data-filter=\"" + this.id + "\">\n	" + (this.renderContents()) + "\n</div>";
    };
    FilterItem.prototype.setChecked = function(checked) {
      this.checked = checked;
      return $('[data-filter="' + this.id + '"]').parent().html(__bind(function() {
        return this.render();
      }, this));
    };
    FilterItem.prototype.action = function() {
      this.setChecked(!this.checked);
      this.filter.updateSelectAll();
      this.filter.fire('change');
      return FilterItem.__super__.action.call(this);
    };
    return FilterItem;
  })();
  SelectFilterItem = (function() {
    __extends(SelectFilterItem, FilterItem);
    function SelectFilterItem(filter, node) {
      this.node = node;
      SelectFilterItem.__super__.constructor.call(this, filter);
    }
    SelectFilterItem.prototype.renderContents = function() {
      return this.node.data.name;
    };
    SelectFilterItem.prototype.check = function(node) {
      return this.checked && (node[this.filter.type].get(this.node) != null);
    };
    return SelectFilterItem;
  })();
  NotInAnyFilterItem = (function() {
    function NotInAnyFilterItem() {
      NotInAnyFilterItem.__super__.constructor.apply(this, arguments);
    }
    __extends(NotInAnyFilterItem, FilterItem);
    NotInAnyFilterItem.prototype.renderContents = function() {
      return "Not in any " + this.filter.name;
    };
    NotInAnyFilterItem.prototype.check = function(node) {
      return this.checked && (node[this.filter.type].length === 0);
    };
    return NotInAnyFilterItem;
  })();
  CheckOption = (function() {
    __extends(CheckOption, Component);
    function CheckOption(filter, text, checked) {
      this.filter = filter;
      this.text = text;
      this.checked = checked != null ? checked : false;
      this.element = $("<div tabindex=\"0\" class=\"check-option" + (this.checked ? " checked" : "") + "\">" + this.text + "</div>");
      this.element.click(this.proxy('action'));
      this.element.keypress(this.proxy('keypress'));
      this.element.appendTo(this.filter.options);
    }
    CheckOption.prototype.setChecked = function(checked) {
      this.checked = checked;
      if (checked) {
        return this.element.addClass('checked');
      } else {
        return this.element.removeClass('checked');
      }
    };
    CheckOption.prototype.keypress = function(e) {
      if (e.which === 13 || e.which === 32) {
        return this.action();
      }
    };
    CheckOption.prototype.action = function() {
      this.setChecked(!this.checked);
      return this.fire('action');
    };
    return CheckOption;
  })();
  Filter = (function() {
    __extends(Filter, ListBox);
    function Filter(type, table, name, className) {
      this.type = type;
      this.name = name;
      Filter.__super__.constructor.call(this, this.name, 'filter ' + className);
      this.createListItems(table);
      this.createOptions();
      this.updateSelectAll();
      this.update();
    }
    Filter.prototype.createOptions = function() {
      this.options = $("<div class=\"filter-options\"></div>");
      this.selectall = new CheckOption(this, 'Select All', false);
      this.negate = new CheckOption(this, 'Negate Selection', false);
      this.selectall.listen('action', __bind(function() {
        this.selectDeselectAll();
        return this.fire('change');
      }, this));
      this.negate.listen('action', __bind(function() {
        return this.fire('change');
      }, this));
      return this.options.appendTo(this.element);
    };
    Filter.prototype.selectDeselectAll = function() {
      var item, _i, _len, _ref, _results;
      _ref = this.items;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        _results.push(item.setChecked(this.selectall.checked));
      }
      return _results;
    };
    Filter.prototype.updateSelectAll = function() {
      var all, item, _i, _len, _ref;
      all = true;
      _ref = this.items;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        if (!item.checked) {
          all = false;
          break;
        }
      }
      return this.selectall.setChecked(all);
    };
    Filter.prototype.createListItems = function(table) {
      var key, list, node;
      list = (function() {
        var _results;
        _results = [];
        for (key in table.data) {
          _results.push(table.data[key]);
        }
        return _results;
      })();
      list.sort(Node.compare);
      this.items = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = list.length; _i < _len; _i++) {
          node = list[_i];
          _results.push(new SelectFilterItem(this, node));
        }
        return _results;
      }).call(this);
      return this.items.push(new NotInAnyFilterItem(this));
    };
    Filter.prototype.checkNode = function(node) {
      var item, _i, _len, _ref;
      if (this.selectall.checked) {
        return true;
      }
      _ref = this.items;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        if (item.check(node)) {
          return true;
        }
      }
      return false;
    };
    Filter.prototype.check = function(node) {
      if (this.checkNode(node)) {
        if (this.negate.checked) {
          return false;
        } else {
          return true;
        }
      }
      if (this.negate.checked) {
        return true;
      } else {
        return false;
      }
    };
    return Filter;
  })();
  FriendItem = (function() {
    __extends(FriendItem, ListItem);
    function FriendItem(app, node) {
      this.app = app;
      this.node = node;
    }
    FriendItem.prototype.render = function() {
      return "<div data-friend=\"" + this.node.key + "\" class=\"list-item friend-item" + (this.node === this.app.selectedFriend ? " selected" : "") + "\">\n	<a href=\"" + this.node.data.profile_url + "\"><img alt=\"(Profile Picture)\" width=\"44\" height=\"44\" src=\"" + this.node.data.pic_square + "\"></a>\n	<span>" + this.node.data.name + "</span>\n</div>";
    };
    FriendItem.prototype.action = function() {
      return this.app.selectFriend(this.node);
    };
    return FriendItem;
  })();
  ListModifyProc = (function() {
    var active, setActive;
    __extends(ListModifyProc, Component);
    active = {};
    setActive = function(friend, list, flag) {
      return active[friend.key + ':' + list.key] = flag;
    };
    ListModifyProc.isActive = function(friend, list) {
      return !!active[friend.key + ':' + list.key];
    };
    function ListModifyProc(app, list, friend, mode) {
      var method, path;
      this.app = app;
      this.list = list;
      this.friend = friend;
      this.mode = mode;
      setActive(this.friend, this.list, true);
      path = this.list.key + '/members/' + this.friend.key;
      if (this.mode) {
        this.friend.lists.add(this.list);
        this.list.friends.add(this.friend);
        method = 'post';
      } else {
        this.friend.lists["delete"](this.list);
        this.list.friends["delete"](this.friend);
        method = 'delete';
      }
      this.updateElements();
      FB.api(path, method, this.proxy('finish'));
    }
    ListModifyProc.prototype.updateElements = function() {
      return $('[data-friend="' + this.friend.key + '"][data-fl="' + this.list.key + '"]').parent().html(__bind(function() {
        return new FriendListItem(this.app, this.list).render();
      }, this));
    };
    ListModifyProc.prototype.finish = function(response) {
      setActive(this.friend, this.list, false);
      if (!response) {
        if (this.mode) {
          this.friend.lists["delete"](this.list);
          this.list.friends["delete"](this.friend);
        } else {
          this.friend.lists.add(this.list);
          this.list.friends.add(this.friend);
        }
      }
      return this.updateElements();
    };
    return ListModifyProc;
  })();
  FriendListItem = (function() {
    __extends(FriendListItem, ListItem);
    function FriendListItem(app, node) {
      this.app = app;
      this.node = node;
    }
    FriendListItem.prototype.disabled = function() {
      return !this.app.selectedFriend || ListModifyProc.isActive(this.app.selectedFriend, this.node);
    };
    FriendListItem.prototype.checked = function() {
      return this.app.selectedFriend && this.app.selectedFriend.lists.get(this.node);
    };
    FriendListItem.prototype.render = function() {
      var addClass;
      addClass = "";
      if (this.disabled()) {
        addClass += " disabled";
      }
      if (this.checked()) {
        addClass += " checked";
      }
      return "<div data-friend=\"" + (this.app.selectedFriend ? this.app.selectedFriend.key : "NA") + "\" data-fl=\"" + this.node.key + "\" class=\"list-item fl-item" + addClass + "\">\n	" + this.node.data.name + "\n</div>";
    };
    FriendListItem.prototype.action = function() {
      var proc;
      if (!this.disabled()) {
        return proc = new ListModifyProc(this.app, this.node, this.app.selectedFriend, !this.checked());
      }
    };
    return FriendListItem;
  })();
  Application = (function() {
    __extends(Application, Component);
    function Application() {
      this.db = new Database;
    }
    Application.prototype.run = function() {
      var loader, progress;
      loader = new DataLoader(this.db);
      progress = new LoadProgressView(loader);
      loader.listen('finish', this.proxy('loaded'));
      return loader.load();
    };
    Application.prototype.loaded = function() {
      this.prepareFilters();
      this.createFriendList();
      this.createAssignList();
      return this.filter();
    };
    Application.prototype.prepareFilters = function() {
      this.listFilter = new Filter('lists', this.db.lists, "List", 'list-filter');
      this.groupFilter = new Filter('groups', this.db.groups, "Group", 'group-filter');
      this.listFilter.listen('change', this.proxy('filter'));
      return this.groupFilter.listen('change', this.proxy('filter'));
    };
    Application.prototype.createFriendList = function() {
      var key;
      this.friendList = new ListBoxWithTitle("Friends", 'friends');
      this.friends = (function() {
        var _results;
        _results = [];
        for (key in this.db.friends.data) {
          _results.push(this.db.friends.data[key]);
        }
        return _results;
      }).call(this);
      return this.friends.sort(Node.compare);
    };
    Application.prototype.createAssignList = function() {
      var key, node;
      this.assignList = new ListBox("Assign To Group", 'assign');
      this.lists = (function() {
        var _results;
        _results = [];
        for (key in this.db.lists.data) {
          _results.push(this.db.lists.data[key]);
        }
        return _results;
      }).call(this);
      this.lists.sort(Node.compare);
      this.assignList.items = (function() {
        var _i, _len, _ref, _results;
        _ref = this.lists;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          node = _ref[_i];
          _results.push(new FriendListItem(this, node));
        }
        return _results;
      }).call(this);
      return this.assignList.update();
    };
    Application.prototype.filter = function() {
      var friends, node, _ref;
      friends = (function() {
        var _i, _len, _ref, _results;
        _ref = this.friends;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          node = _ref[_i];
          if (this.listFilter.check(node) && this.groupFilter.check(node)) {
            _results.push(node);
          }
        }
        return _results;
      }).call(this);
      this.friendList.items = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = friends.length; _i < _len; _i++) {
          node = friends[_i];
          _results.push(new FriendItem(this, node));
        }
        return _results;
      }).call(this);
      this.friendList.update();
      if (!(_ref = this.selectedFriend, __indexOf.call(friends, _ref) >= 0)) {
        return this.selectFriend(void 0);
      }
    };
    Application.prototype.updateFriend = function(node) {
      if (node) {
        return $('[data-friend="' + node.key + '"]').parent().html(__bind(function() {
          return new FriendItem(this, node).render();
        }, this));
      }
    };
    Application.prototype.selectFriend = function(node) {
      var oldSelectedFriend;
      oldSelectedFriend = this.selectedFriend;
      this.selectedFriend = node;
      this.updateFriend(oldSelectedFriend);
      this.updateFriend(this.selectedFriend);
      return this.assignList.update();
    };
    return Application;
  })();
  REQUIRED_PERMISSIONS = 'user_groups,friends_groups,read_friendlists,manage_friendlists,user_checkins,friends_checkins';
  Login = (function() {
    __extends(Login, Component);
    function Login(callback, message) {
      this.callback = callback;
      this.element = $('<div id="login"><a href="javascript://"></a></div>');
      this.link = this.element.find('a');
      this.link.html(message);
      this.link.click(this.proxy('login'));
    }
    Login.prototype.login = function() {
      this.element.remove();
      return FB.login(this.callback, {
        perms: REQUIRED_PERMISSIONS
      });
    };
    return Login;
  })();
  Bootstrapper = (function() {
    __extends(Bootstrapper, Component);
    function Bootstrapper() {
      FB.getLoginStatus(this.proxy('gotSession'));
    }
    Bootstrapper.prototype.gotSession = function(response) {
      if (response.session) {
        if (this.checkPermission(response.perms)) {
          return this.initializeApp();
        } else {
          return this.showLogin("Set Permissions");
        }
      } else {
        return this.showLogin("Connect with Facebook");
      }
    };
    Bootstrapper.prototype.checkPermission = function(perms) {
      var available, perm, required, _i, _len;
      required = REQUIRED_PERMISSIONS.split(',');
      available = eval('(' + perms + ')');
      if (!(available != null)) {
        return true;
      }
      for (_i = 0, _len = required.length; _i < _len; _i++) {
        perm = required[_i];
        if (!(__indexOf.call(available.extended, perm) >= 0)) {
          if (!(__indexOf.call(available.user, perm) >= 0)) {
            if (!(__indexOf.call(available.friends, perm) >= 0)) {
              return false;
            }
          }
        }
      }
      return true;
    };
    Bootstrapper.prototype.initializeApp = function() {
      var app;
      app = new Application;
      window.app = app;
      return app.run();
    };
    Bootstrapper.prototype.showLogin = function(message) {
      return new Login(this.proxy('gotSession'), message);
    };
    return Bootstrapper;
  })();
  AccessibilityHelper = (function() {
    __extends(AccessibilityHelper, Component);
    function AccessibilityHelper() {
      $(window).keydown(this.proxy('keydown'));
    }
    AccessibilityHelper.prototype.keydown = function(e) {
      var target;
      target = $(e.target);
      if (e.which === 38) {
        target.closest('.list-item-container').prev('.list-item-container').each(function() {
          return this.focus();
        });
        return false;
      } else if (e.which === 40) {
        target.closest('.list-item-container').next('.list-item-container').each(function() {
          return this.focus();
        });
        return false;
      } else if (e.which === 37) {
        target.closest('.listbox').prev('.listbox').find('.list-item-container').eq(0).each(function() {
          return this.focus();
        });
        return false;
      } else if (e.which === 39) {
        target.closest('.listbox').next('.listbox').find('.list-item-container').eq(0).each(function() {
          return this.focus();
        });
        return false;
      }
    };
    return AccessibilityHelper;
  })();
  $(function() {
    new AccessibilityHelper;
    return new Bootstrapper;
  });
}).call(this);
