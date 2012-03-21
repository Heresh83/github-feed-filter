$.expr[':'].contains_ci = function(a, i, m) { return $(a).text().toUpperCase().indexOf(m[3].toUpperCase()) >= 0; };
var Ghf = {
  feeds: {}, counts: {}, ui: {}, timer_id: '',
  init: function() {
    this.searchterm = '';
    this.rel = '';
    this.selected_item = '';
    this.feeds = {};
    this.oldcount = this.counts['all'] || 0;
    this.counts = { 'all': 0, 'commits': 0, 'comments': 0, 'issues': 0 };
    this.ui = { body: [], bottom: "</div> </div>", top: "<div class='repos' id='your_feeds'> <div class='top-bar'> <h2 class='count'>News Feed <em></em></h2> </div><div class='filter-bar'> <input class='filter_input' placeholder='Find a repository feed…' type='search'><ul class='repo_filterer'> <li class='all_repos'><a href='#' class='repo_filter filter_selected' rel='all'>All Feeds</a></li> <li><a href='#' class='repo_filter' rel='commits'>Commits</a></li> <li><a href='#' class='repo_filter' rel='comments'>Comments</a></li> <li><a href='#' class='repo_filter' rel='issues'>Issues</a></li> </ul> </div>" };
  },
  run: function() {
    this.init();
    this.searchterm = $("#your_feeds .filter_input").val();
    this.rel = $('#your_feeds .repo_filterer a.filter_selected').attr('rel');
    this.selected_item = $('#feed_listing li[selected="1"] span[class!="spancount"]').text();
    if(!this.read())
      this.timer_id = setInterval(this.read(), 1000);
  },
  read: function() {
    this.read_feeds();
    if(this.oldcount < this.counts['all']) {
      if(this.timer_id !== undefined)
        clearInterval(this.timer_id);
      this.oldcount = this.counts['all'];
      this.act();
      return true;
    }
    return false;
  },
  act: function() {
    this.create_ui();
    this.show_ui();
    this.script_events();
    this.monitor_page();
  },
  Utils: {
    keys: function(obj) {
      var keys = [];
      for(var k in obj) keys.push(k);
      return keys;
    }
  },
  add_feed: function(name, key, idx) {
    var f = this.feeds[name];
    if(f === undefined) {
      f = { all: [idx] };
      f[key] = [idx];
    }
    else if(f[key] === undefined) {
      f[key] = [idx];
      f['all'].push(idx);
    }
    else {
      f[key].push(idx);
      f['all'].push(idx);
    }
    this.feeds[name] = f;
    this.counts['all']++;
    this.counts[key]++;
  },
  read_feeds: function() {
    var self = this;
    $('div.alert').each(function(idx) {
      var title = $(this).find('div.title');
      var cat = $(this).attr('class').split(' ')[1], x = -1;
      switch(cat) {
        case 'issues_opened': case 'issues_reopened': case 'issues_closed':
          x = 2, cat = 'issues';
        break;
        case 'issues_comment': case 'commit_comment':
          x = cat === 'issues_comment' ? 2 : 1, cat = 'comments';
        break;
        case 'push':
          x = 1, cat = 'commits';
        break;
      }
      if(x != -1)
        self.add_feed($(title.find('a')[x]).html(), cat, idx);
    });
  },
  create_ui: function() {
    var self = this;
    var repos = self.Utils.keys(self.feeds);
    self.ui.body.push('<div style="padding: 5px; font-size: 12px; text-align: right;" id="reset_filter"><a>Reset Filter</a></div>');
    self.ui.body.push('<ul id="feed_listing" class="repo_list">');
    $.each(repos, function(idx, repo) {
      var r = repo.split('/');
      var cats = self.Utils.keys(self.feeds[repo]);
      self.ui.body.push('<li class="public ' + cats.join(' ') + '"><a class="feedlink" href="#"><span class="mini-icon public-repo"></span><span class="owner">' + r[0] + '</span>/<span class="repo">' + r[1] + '</span></a>');
      $.each(cats, function(idx, val) {
        self.ui.body.push('<span class="spancount" rel="' + val + '">(' + self.feeds[repo][val].length + ')</span>');
      });
      self.ui.body.push('</li>');
    });
    self.ui.body.push('</ul>');
  },
  show_ui: function() {
    $('div#your_feeds').remove();
    $('div#your_repos').before(this.ui.top + this.ui.body.join('') + this.ui.bottom);
  },
  script_events: function() {
    var self = this;
    this.set_spans('all');
    this.setup_search();
    this.attach_name_handlers();
    this.setup_cat_filters();
    this.reset_filter_event();

    $("#your_feeds .filter_input").val(this.searchterm);
    if(this.rel !== '') {
      $('#your_feeds a.repo_filter[rel="' + this.rel + '"]').click();
    }
    if(self.selected_item !== '') {
      $.each($('#feed_listing li'), function(i, item) {
        if(self.selected_item == $(item).find('span[class!="spancount"]').text()) {
          $(this).find('a').click();
        }
      });
    }
  },
  reset_filter_event: function() {
    var self = this;
    $('div#reset_filter').click(function() {
      self.highlight_item();
      self.hide_feeds();
      var r = $('#your_feeds .filter_selected').attr('rel');
      $.each($('ul#feed_listing li:visible a'), function(i, item) {
        $.each(self.feeds[$(item).text()][r], self.show_feed_n);
      });
    });
  },
  attach_name_handlers: function() {
    var self = this;
    $('#feed_listing li a').click(function(evt) {
      self.hide_feeds();
      self.highlight_item($(this).parent());
      $.each(self.feeds[$(this).text()][$(this).siblings('span:visible').attr('rel')], self.show_feed_n);
      evt.preventDefault();
      evt.stopPropagation();
    });
  },
  highlight_item: function(to_hl) {
    $.each($('#feed_listing li'), function(i, item) {
      if($(item) !== to_hl) {
        $(item).css('background-color', '#FFF');
        $(item).removeAttr('selected');
      }
    });
    if(to_hl !== undefined) {
      to_hl.css('background-color', '#F2F0B6');
      to_hl.attr('selected', '1');
    }
  },
  setup_cat_filters: function() {
    var self = this;
    $('#your_feeds .repo_filter').click(function(evt) {
      var t = $(this), r = t.attr('rel');
      t.parents('ul').find('a').removeClass('filter_selected');
      t.addClass('filter_selected');
      self.set_spans(r);
      self.search($('#your_feeds .filter_input').val(), r);
      self.hide_feeds();
      if($('ul#feed_listing li[selected="1"]:visible').length > 0)
        item_selector = 'ul#feed_listing li[selected="1"]:visible a';
      else
        item_selector = 'ul#feed_listing li:visible a';
      $.each($(item_selector), function(i, item) {
        $.each(self.feeds[$(item).text()][r], self.show_feed_n);
      });
      evt.preventDefault();
      evt.stopPropagation();
    });
  },
  setup_search: function() {
    var self = this;
    $('#your_feeds .filter_input').addClass('native').bind('keyup blur click', function(e) { self.search(this.value); });
  },
  search: function(srch, rel) {
    var items = $('ul#feed_listing li').hide();
    if(!rel)
      rel = $('#your_feeds .repo_filterer a.filter_selected').attr('rel');
    $('ul#feed_listing').find('li.' + rel).show();
    srch != "" && items.filter(":not(:contains_ci('" + srch + "'))").hide();
  },
  monitor_page: function() {
    $('div.news .pagination a').click(function() {
      setTimeout(function() { Ghf.run(); }, 2000);
    });
  },
  hide_feeds: function() {
    $('div.alert').hide();
  },
  show_feed_n: function(i, n) {
    $('div.alert:eq(' + n + ')').show();
  },
  set_count: function(n) {
    $('#your_feeds h2.count em').html('(' + n + ')');
  },
  set_spans: function(rel) {
    this.set_count(this.counts[rel]);
    var f = $('ul#feed_listing');
    f.find('span[rel]').hide();
    f.find('span[rel="' + rel + '"]').show();
  }
};
Ghf.run();
