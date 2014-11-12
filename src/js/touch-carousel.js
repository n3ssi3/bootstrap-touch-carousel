+(function ($) {
  'use strict';

  /**
   * Return whole plugin if touch is not supported
   */
  if (!('ontouchstart' in window || navigator.msMaxTouchPoints)) return false;

  // CONST
  var NAMESPACE = 'touch-carousel';

  // TouchCarousel Constructor
  // -------------------
  var TouchCarousel = function (element, options) {
    this.$element       = $(element);
    this.$itemsWrapper  = this.$element.find('.carousel-inner');
    this.$items         = this.$element.find('.item');
    this.$indicators    = this.$element.find('.carousel-indicators');
    this.paneWidth     = 0;
    this.itemWidth     = this.paneWidth;
    this.paneCount     = 0;
    this.currentPane   = 0;
    this.onGesture      = false;
    this.options        = options;

    this._setPaneDimensions()
    // disable carousel if there is only one
    // or no item. (fixes # 6)
    if (this.$items.length <= 1) return this.disable()

    this._regTouchGestures()

    $(window).on('orientationchange resize', $.proxy(this._setPaneDimensions, this));
  }

  TouchCarousel.DEFAULTS = {
    interval: false,
    toughness: 0.25
  }

  // TouchCarousel Prototype methods
  // -------------------

  TouchCarousel.prototype.cycle = function (e) {
    if (!e) this.paused = false
    if (this.interval) clearInterval(this.interval);
    this.options.interval
      && !this.paused
      && (this.interval = setInterval($.proxy(this.next, this), this.options.interval))
    return this
  }

  TouchCarousel.prototype.to = function (pos) {
    if (pos > (this.$items.length - 1) || pos < 0) return
    return this._showPane(pos);
  }

  TouchCarousel.prototype.pause = function (e) {
    if (!e) this.paused = true

    clearInterval(this.interval)
    this.interval = null
    return this
  }

  TouchCarousel.prototype._regTouchGestures = function () {
    this.$itemsWrapper
      .add(this.$indicators) // fixes issue #9
      .hammer({
        dragLockToAxis: true,
        preventDefault: true
      })
      .on('release dragleft dragright swipeleft swiperight', $.proxy(this._handleGestures, this));
  }

  TouchCarousel.prototype._setPaneDimensions = function () {
    this.paneWidth = this.$element.width();
    this.itemWidth = this.paneWidth - this.$items.css('padding-left').replace('px', '') - this.$items.css('padding-right').replace('px', '');
    this.paneCount = this.$items.length;

    // Set items & wrapper to fixed width
    this.$itemsWrapper.width(this.paneWidth * this.paneCount);
    this.$items.width(this.itemWidth);
  }

  TouchCarousel.prototype._showPane= function (index) {
    // remove class from prev pane
    this.$items.eq(this.currentPane).toggleClass('active');

    // Last Item reached
    if (index >= this.paneCount) {
      this.pause();
    }

    // between the bounds
    // add active state to the current pane
    index = Math.max(0, Math.min(index, this.paneCount-1));
    // var $next = this.$items.eq(index).toggleClass('active');
    this.currentPane = index;

    var offset = -((100/this.paneCount) * this.currentPane);
    this._setContainerOffset(offset, true, index);

    return this;
  }

  TouchCarousel.prototype._setContainerOffset = function (percent, animate, index) {
    var that = this;

    this.$itemsWrapper.removeClass('animate');

    if (animate) this.$itemsWrapper.addClass('animate');

    // CSS3 Transforms3D Animation
    if ($.support.csstransforms3d) {
      this.onGesture = true;
      this.$itemsWrapper.css('transform', 'translate3d('+ percent +'%,0,0) scale3d(1,1,1)');
    }

    // CSS3 Transform Animation
    else if ($.support.csstransforms) {
      this.onGesture = true;
      this.$itemsWrapper.css('transform', 'translate('+ percent +'%,0)');
    }

    // CSS3 Transition
    else {
      var px = ((this.paneWidth * this.paneCount) / 100) * percent;
      this.$itemsWrapper.css('left', px +'px');
    }

    // Transition Complete
    if ($.support.transition) {
      this.$itemsWrapper.one($.support.transition.end, function () {
        that.$itemsWrapper.removeClass('animate');
        that.onGesture = false;
        that._updateIndicators(index);
      });
    } else {
      this.$itemsWrapper.removeClass('animate');
      this.onGesture = false;
      this._updateIndicators(index);
    }
  }

  TouchCarousel.prototype.next = function () {
    var $active   = this.$element.find('.item.active');
    var $next   = $active.next();
    var e = $.Event('slide.bs.carousel', { relatedTarget: $next[0], direction: 'left' });
    this.$element.trigger(e);

    this._showPane(this.currentPane+1);

    this.$element.trigger('slid');

    return this;
  }

  TouchCarousel.prototype.prev = function () {
    var $active   = this.$element.find('.item.active');
    var $next   = $active.prev();
    var e = $.Event('slide.bs.carousel', { relatedTarget: $next[0], direction: 'right' });
    this.$element.trigger(e);

    this._showPane(this.currentPane-1);

    this.$element.trigger('slid');

    return this;
  }

  TouchCarousel.prototype._handleGestures = function (e) {

    if (this.sliding) {
      return;
    }

    // Stop slideshow onGesture
    this.pause();

    switch (e.type) {
      case 'dragright':
      case 'dragleft':
        // stick to the finger
        var paneOffset = -(100/  this.paneCount) * this.currentPane;
        var dragOffset = ((100/ this.paneWidth) * e.gesture.deltaX) / this.paneCount;

        // slow down at the first and last pane
        if ((this.currentPane === 0 && e.gesture.direction == Hammer.DIRECTION_RIGHT) ||
          (this.currentPane == this.paneCount-1 && e.gesture.direction == Hammer.DIRECTION_LEFT)) {
          dragOffset *= this.options.toughness;
        }

        this._setContainerOffset(dragOffset + paneOffset);
        break;

      case 'swipeleft':
        this.next();
        e.gesture.stopDetect();
        break;

      case 'swiperight':
        this.prev();
        e.gesture.stopDetect();
        break;

      case 'release':
        // more then 50% moved, navigate
        if (Math.abs(e.gesture.deltaX) > this.paneWidth/2) {
          if (e.gesture.direction == 'right') {
            this.prev();
          } else {
            this.next();
          }
        } else {
          this._showPane(this.currentPane, true);
        }
        break;
    }
  }

  TouchCarousel.prototype.disable = function () {
    this.$indicators.hide()
    this.$element.removeData(NAMESPACE);

    return false;
  }

  TouchCarousel.prototype._updateIndicators = function (index) {
    if (this.$indicators.length) {
      this.$indicators.find('.active').removeClass('active');
      this.$indicators.children().eq(index).addClass('active');
    }

    this.$element.trigger('slid.bs.carousel');

    return this;
  }

  // CAROUSEL PLUGIN DEFINITION
  // ==========================

  var old = $.fn.carousel

  // Overwrite default fn.carousel
  $.fn.carousel = function (option) {
    return this.each(function () {
      var $this   = $(this);
      var data    = $this.data(NAMESPACE);
      var options = $.extend({}, TouchCarousel.DEFAULTS, $this.data(), typeof option == 'object' && option);
      var action  = typeof option == 'string' ? option : options.slide;

      if (!data) {
        $this.data(NAMESPACE, (data = new TouchCarousel(this, options))).addClass(NAMESPACE)
      }

      if (typeof option == 'number') {
        data.to(option);
      } else if (action) {
        data[action]();
      } else if (options.interval) {
        data.pause().cycle();
      }
    })
  }

  $.fn.carousel.Constructor = TouchCarousel

  // CAROUSEL NO CONFLICT
  // ====================

  $.fn.carousel.noConflict = function () {
    $.fn.carousel = old
    return this
  }

  // CAROUSEL DATA-API
  // =================

  // unbind default carousel data-API
  $(document).off('click.bs.carousel').on('click.bs.carousel.data-api', '[data-slide], [data-slide-to]', function (e) {
    var $this    = $(this), href
    var $target  = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) //strip for ie7
    var options  = $.extend({}, $target.data(), $this.data())
    var slideIndex = $this.attr('data-slide-to')
    if (slideIndex) options.interval = false

    $target.carousel(options)

    if (slideIndex = $this.attr('data-slide-to')) {
      $target.data(NAMESPACE).to(slideIndex)
    }

    e.preventDefault()
  });

} (window.jQuery));
