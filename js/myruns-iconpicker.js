/*!
 * MyRuns Icon Picker v1.0.0
 * FontAwesome 7 Icon Picker for MyRuns Admin
 * 
 * Compatible API with bootstrap-iconpicker for easy migration
 */

;(function($) { "use strict";

    let modalCounter = 0;

    // MYRUNS ICONPICKER PUBLIC CLASS
    // ================================
    const MyRunsIconPicker = function(element, options) {
        this.$element = $(element);
        this.options = $.extend({}, MyRunsIconPicker.DEFAULTS, options);
        this.icons = null;
        this.filteredIcons = [];
        this.currentFamily = this.options.family;
        this.currentIcon = this.options.icon;
        this.currentPage = 0;
        this.modalId = `myrunsIconPickerModal-${++modalCounter}`;
        this.bootstrapModal = null;
        
        this.init();
    };

    // VERSION
    // ================================
    MyRunsIconPicker.VERSION = '1.0.0';
    
    // SHARED ICON DATA CACHE
    // ================================
    MyRunsIconPicker._iconDataCache = null;
    MyRunsIconPicker._iconDataPromise = null;

    // DEFAULTS
    // ================================
    MyRunsIconPicker.DEFAULTS = {
        family: 'solid',          // Default family: solid, regular, light, thin, duotone, brands
        icon: '',                 // Initial icon (e.g., 'house')
        rows: 5,                  // Icons per row
        cols: 10,                 // Number of columns
        search: true,             // Show search box
        searchText: 'Search icons...',
        selectedClass: 'btn-warning',
        unselectedClass: 'btn-light',
        placement: 'bottom',      // Popover placement
        title: 'Select Icon',
        iconsPerPage: 50,         // Icons to display per page
        buttonClass: '',          // Custom class for trigger button (e.g., 'btn btn-primary btn-sm')
        dataUrl: null
    };

    // FAMILIES CONFIG
    // ================================
    MyRunsIconPicker.FAMILIES = {
        solid: { class: 'fa-solid', label: 'Solid', icon: 'circle', color: '#2c3e50' },
        regular: { class: 'fa-regular', label: 'Regular', icon: 'circle', color: '#3498db' },
        light: { class: 'fa-light', label: 'Light', icon: 'circle', color: '#9b59b6' },
        thin: { class: 'fa-thin', label: 'Thin', icon: 'circle', color: '#e74c3c' },
        duotone: { class: 'fa-duotone', label: 'Duotone', icon: 'circle', color: '#f39c12' },
        brands: { class: 'fa-brands', label: 'Brands', icon: 'font-awesome', color: '#16a085' }
    };

    // INIT
    // ================================
    MyRunsIconPicker.prototype.init = function() {
        const self = this;

        this.options.dataUrl = this.resolveDataUrl(this.options.dataUrl);
        
        // Apply custom button class if specified
        if (this.options.buttonClass && this.$element.is('button')) {
            this.$element.addClass(this.options.buttonClass);
        }
        
        // Create modal structure immediately (but don't populate)
        this.createModal();
        
        // Load icon data
        this.loadIcons().then(() => {
            self.isReady = true;
            self.bindEvents();
            
            // Set initial icon if provided
            if (self.currentIcon) {
                self.setIcon(self.currentIcon);
            }
        });
    };

    // RESOLVE DATA URL
    // ================================
    MyRunsIconPicker.prototype.resolveDataUrl = function(dataUrl) {
        if (dataUrl) {
            return dataUrl;
        }

        const scriptName = 'myruns-iconpicker.js';
        const scripts = document.getElementsByTagName('script');

        for (let index = scripts.length - 1; index >= 0; index--) {
            const src = scripts[index].getAttribute('src') || '';

            if (src.indexOf(scriptName) === -1) {
                continue;
            }

            const resolvedSrc = new URL(src, window.location.href);
            return new URL('../data/fa7-icons.json', resolvedSrc).toString();
        }

        return 'data/fa7-icons.json';
    };

    // PARSE ICON CLASS
    // ================================
    MyRunsIconPicker.prototype.parseIconClass = function(iconClass) {
        const parsed = {
            family: null,
            icon: ''
        };

        if (!iconClass || typeof iconClass !== 'string') {
            return parsed;
        }

        const tokens = iconClass.trim().split(/\s+/);

        Object.keys(MyRunsIconPicker.FAMILIES).forEach(family => {
            if (tokens.includes(MyRunsIconPicker.FAMILIES[family].class)) {
                parsed.family = family;
            }
        });

        tokens.forEach(token => {
            if (token.indexOf('fa-') === 0 && !Object.values(MyRunsIconPicker.FAMILIES).some(config => config.class === token)) {
                parsed.icon = token.replace('fa-', '');
            }
        });

        return parsed;
    };

    // LOAD ICONS
    // ================================
    MyRunsIconPicker.prototype.loadIcons = function() {
        const self = this;
        
        // Return cached data if available
        if (MyRunsIconPicker._iconDataCache) {
           // console.log('MyRunsIconPicker: Using cached icon data');
            self.icons = MyRunsIconPicker._iconDataCache;
            self.filterIcons();
            return $.Deferred().resolve().promise();
        }
        
        // If already loading, wait for the existing promise
        if (MyRunsIconPicker._iconDataPromise) {
            //console.log('MyRunsIconPicker: Waiting for icon data to load...');
            return MyRunsIconPicker._iconDataPromise.then(function() {
                self.icons = MyRunsIconPicker._iconDataCache;
                self.filterIcons();
            });
        }
        
        // Load icon data for the first time
        //  console.log('MyRunsIconPicker: Loading icon data from', this.options.dataUrl);
        MyRunsIconPicker._iconDataPromise = $.ajax({
            url: this.options.dataUrl,
            dataType: 'json',
            cache: true
        }).done(function(data) {
            MyRunsIconPicker._iconDataCache = data.icons;
            self.icons = data.icons;
            self.filterIcons();
            //console.log('MyRunsIconPicker: Icon data loaded and cached');
        }).fail(function() {
            console.error('MyRunsIconPicker: Failed to load icon data');
            MyRunsIconPicker._iconDataPromise = null;
            self.icons = {};
            self.filteredIcons = [];
        });
        
        return MyRunsIconPicker._iconDataPromise;
    };

    // CREATE MODAL
    // ================================
    MyRunsIconPicker.prototype.createModal = function() {
        const modalHtml = `
            <div class="modal fade myruns-iconpicker-modal" id="${this.modalId}" tabindex="-1" role="dialog" aria-hidden="true">
                <div class="modal-dialog modal-lg" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${this.options.title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Family Selector -->
                            <div class="myruns-iconpicker-families mb-3">
                                ${this.renderFamilySelector()}
                            </div>
                            
                            <!-- Search -->
                            ${this.options.search ? `
                            <div class="mb-3">
                                <input type="text" class="form-control myruns-iconpicker-search" 
                                       placeholder="${this.options.searchText}">
                            </div>
                            ` : ''}
                            
                            <!-- Icon Grid -->
                            <div class="myruns-iconpicker-grid"></div>
                            
                            <!-- Pagination -->
                            <div class="myruns-iconpicker-pagination mt-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <button class="btn btn-sm btn-secondary myruns-iconpicker-prev" disabled>
                                        <i class="fa fa-chevron-left"></i> Previous
                                    </button>
                                    <span class="myruns-iconpicker-info">Page 1 of 1</span>
                                    <button class="btn btn-sm btn-secondary myruns-iconpicker-next" disabled>
                                        Next <i class="fa fa-chevron-right"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary myruns-iconpicker-select">Select</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        // Append to body
        $('body').append(modalHtml);
        
        this.$modal = $('#' + this.modalId);

        if (window.bootstrap && window.bootstrap.Modal) {
            this.bootstrapModal = window.bootstrap.Modal.getOrCreateInstance(this.$modal[0]);
        }
    };

    // RENDER FAMILY SELECTOR
    // ================================
    MyRunsIconPicker.prototype.renderFamilySelector = function() {
        let html = '<div class="btn-group btn-group-sm w-100" role="group">';
        
        Object.keys(MyRunsIconPicker.FAMILIES).forEach(family => {
            const config = MyRunsIconPicker.FAMILIES[family];
            const active = family === this.currentFamily ? 'active' : '';
            
            html += `
                <button type="button" class="btn btn-outline-secondary ${active}" 
                        data-family="${family}" 
                        title="${config.label}"
                        style="border-color: ${config.color}; ${active ? `background-color: ${config.color}; color: white;` : ''}">
                    <i class="fa ${config.class} fa-${config.icon}"></i> ${config.label}
                </button>
            `;
        });
        
        html += '</div>';
        return html;
    };

    // BIND EVENTS
    // ================================
    MyRunsIconPicker.prototype.bindEvents = function() {
        const self = this;
        
        // Element click to open modal
        this.$element.off('click.myrunsiconpicker').on('click.myrunsiconpicker', function(e) {
            e.preventDefault();
            self.show();
        });
        
        // Family selector
        this.$modal.find('.myruns-iconpicker-families button').on('click', function() {
            const family = $(this).data('family');
            self.changeFamily(family);
        });
        
        // Search
        this.$modal.find('.myruns-iconpicker-search').on('input', function() {
            self.search($(this).val());
        });
        
        // Icon selection
        this.$modal.on('click', '.myruns-iconpicker-grid .icon-item', function() {
            const iconName = $(this).data('icon');
            self.selectIcon(iconName);
        });
        
        // Double click to apply
        this.$modal.on('dblclick', '.myruns-iconpicker-grid .icon-item', function() {
            const iconName = $(this).data('icon');
            self.selectIcon(iconName);
            self.applyIcon();
        });
        
        // Pagination
        this.$modal.find('.myruns-iconpicker-prev').on('click', function() {
            if (self.currentPage > 0) {
                self.currentPage--;
                self.renderIcons();
            }
        });
        
        this.$modal.find('.myruns-iconpicker-next').on('click', function() {
            const totalPages = Math.ceil(self.filteredIcons.length / self.options.iconsPerPage);
            if (self.currentPage < totalPages - 1) {
                self.currentPage++;
                self.renderIcons();
            }
        });
        
        // Select button
        this.$modal.find('.myruns-iconpicker-select').on('click', function() {
            if (self.currentIcon) {
                self.applyIcon();
            }
        });
    };

    // FILTER ICONS
    // ================================
    MyRunsIconPicker.prototype.filterIcons = function(searchTerm = '') {
        if (!this.icons) return;

        this.filteredIcons = [];
        const lowerSearch = searchTerm.toLowerCase();

        Object.keys(this.icons).forEach(iconName => {
            const icon = this.icons[iconName];

            // Filter by family
            if (!icon.families[this.currentFamily]) return;

            // Filter by search term
            if (searchTerm) {
                const matchLabel = icon.label.toLowerCase().includes(lowerSearch);
                const matchName = iconName.toLowerCase().includes(lowerSearch);
                const matchTerms = icon.terms.some(term =>
                    term.toLowerCase().includes(lowerSearch)
                );

                if (!matchLabel && !matchName && !matchTerms) return;
            }

            this.filteredIcons.push(iconName);
        });

        // Si hay un icono seleccionado, ir a su página
        let page = 0;
        if (this.currentIcon && this.filteredIcons.length > 0) {
            const idx = this.filteredIcons.indexOf(this.currentIcon);
            if (idx !== -1) {
                page = Math.floor(idx / this.options.iconsPerPage);
            }
        }
        this.currentPage = page;
        this.renderIcons();
    };

    // SEARCH
    // ================================
    MyRunsIconPicker.prototype.search = function(term) {
        this.filterIcons(term);
    };

    // CHANGE FAMILY
    // ================================
    MyRunsIconPicker.prototype.changeFamily = function(family) {
        this.currentFamily = family;
        
        // Update button states
        this.$modal.find('.myruns-iconpicker-families button').removeClass('active').each(function() {
            const $btn = $(this);
            const btnFamily = $btn.data('family');
            const config = MyRunsIconPicker.FAMILIES[btnFamily];
            
            if (btnFamily === family) {
                $btn.addClass('active');
                $btn.css({
                    'background-color': config.color,
                    'color': 'white',
                    'border-color': config.color
                });
            } else {
                $btn.css({
                    'background-color': '',
                    'color': '',
                    'border-color': config.color
                });
            }
        });
        
        // Clear search and refilter
        this.$modal.find('.myruns-iconpicker-search').val('');
        this.filterIcons();
    };

    // RENDER ICONS
    // ================================
    MyRunsIconPicker.prototype.renderIcons = function() {
        const $grid = this.$modal.find('.myruns-iconpicker-grid');
        const start = this.currentPage * this.options.iconsPerPage;
        const end = start + this.options.iconsPerPage;
        const pageIcons = this.filteredIcons.slice(start, end);
        let familyClass = 'fa-solid';
        if (!MyRunsIconPicker.FAMILIES[this.currentFamily]) {
            console.warn('MyRunsIconPicker: Invalid family', this.currentFamily, '- using solid');
            this.currentFamily = 'solid';
        }
        familyClass = MyRunsIconPicker.FAMILIES[this.currentFamily].class;

        let html = '<div class="row g-2">';

        pageIcons.forEach(iconName => {
            const icon = this.icons[iconName];
            const selected = iconName === this.currentIcon ? this.options.selectedClass : this.options.unselectedClass;

            html += `
                <div class="col-4 col-sm-3 col-md-2 col-lg-1">
                    <button class="btn ${selected} icon-item w-100 text-center" 
                            data-icon="${iconName}" 
                            title="${icon.label}">
                        <i class="fa ${familyClass} fa-${iconName} fa-3x d-block mb-1"></i>
                        <small class="d-block text-truncate">${iconName}</small>
                    </button>
                </div>
            `;
        });

        html += '</div>';

        if (pageIcons.length === 0) {
            html = '<div class="alert alert-info">No icons found</div>';
        }

        $grid.html(html);

        // Update pagination
        this.updatePagination();
    };

    // UPDATE PAGINATION
    // ================================
    MyRunsIconPicker.prototype.updatePagination = function() {
        const totalPages = Math.ceil(this.filteredIcons.length / this.options.iconsPerPage);
        const $prev = this.$modal.find('.myruns-iconpicker-prev');
        const $next = this.$modal.find('.myruns-iconpicker-next');
        const $info = this.$modal.find('.myruns-iconpicker-info');
        
        $prev.prop('disabled', this.currentPage === 0);
        $next.prop('disabled', this.currentPage >= totalPages - 1);
        
        const start = this.currentPage * this.options.iconsPerPage + 1;
        const end = Math.min((this.currentPage + 1) * this.options.iconsPerPage, this.filteredIcons.length);
        
        $info.text(`${start}-${end} of ${this.filteredIcons.length} icons (Page ${this.currentPage + 1} of ${totalPages || 1})`);
    };

    // SELECT ICON
    // ================================
    MyRunsIconPicker.prototype.selectIcon = function(iconName) {
        this.currentIcon = iconName;
        
        // Update visual selection
        this.$modal.find('.icon-item').removeClass(this.options.selectedClass)
                                       .addClass(this.options.unselectedClass);
        this.$modal.find(`.icon-item[data-icon="${iconName}"]`)
                   .removeClass(this.options.unselectedClass)
                   .addClass(this.options.selectedClass);
    };

    // APPLY ICON
    // ================================
    MyRunsIconPicker.prototype.applyIcon = function() {
        if (!this.currentIcon) return;
        
        const familyClass = MyRunsIconPicker.FAMILIES[this.currentFamily].class;
        const fullClass = `fa ${familyClass} fa-${this.currentIcon}`;
        
        //console.log('MyRunsIconPicker: Applying icon', this.currentIcon, fullClass);
        
        // Update element
        if (this.$element.is('i')) {
            this.$element.attr('class', fullClass);
            //console.log('Updated <i> element');
        } else if (this.$element.is('input')) {
            this.$element.val(fullClass);
            // Update icon preview if exists
            const $preview = this.$element.prev('i.iconpicker-preview');
            if ($preview.length) {
                $preview.attr('class', fullClass + ' iconpicker-preview');
            }
                //console.log('Updated <input> element');
        } else if (this.$element.is('button') || this.$element.is('a')) {
            // Update icon inside button/link
            const $icon = this.$element.find('i').first();
            if ($icon.length) {
                $icon.attr('class', fullClass);
                //console.log('Updated icon inside button:', $icon);
            }
        }
        
        // Trigger change event (compatible with bootstrap-iconpicker)
        this.$element.trigger({ 
            type: "change", 
            icon: this.currentIcon,
            iconClass: fullClass
        });
        
        //console.log('Triggered change event');
        
        this.hide();
    };

    // SHOW MODAL
    // ================================
    MyRunsIconPicker.prototype.show = function() {
        // Don't show if data not loaded yet
        if (!this.isReady || !this.icons) {
            console.warn('MyRunsIconPicker: Icon data not loaded yet');
            return;
        }
        
        if (this.bootstrapModal) {
            this.bootstrapModal.show();
        } else if ($.fn.modal) {
            this.$modal.modal('show');
        }

        this.renderIcons();
    };

    // HIDE MODAL
    // ================================
    MyRunsIconPicker.prototype.hide = function() {
        if (this.bootstrapModal) {
            this.bootstrapModal.hide();
        } else if ($.fn.modal) {
            this.$modal.modal('hide');
        }
    };

    // PUBLIC API: setIcon (compatible with bootstrap-iconpicker)
    // ================================
    MyRunsIconPicker.prototype.setIcon = function(icon) {
        const parsed = this.parseIconClass(icon);

        if (parsed.family) {
            this.currentFamily = parsed.family;
        }

        if (parsed.icon) {
            icon = parsed.icon;
        }
        
        this.currentIcon = icon;
        
        // Update element display
        const familyClass = MyRunsIconPicker.FAMILIES[this.currentFamily].class;
        const fullClass = `fa ${familyClass} fa-${icon}`;
        
        if (this.$element.is('i')) {
            this.$element.attr('class', fullClass);
        } else if (this.$element.is('input')) {
            this.$element.val(fullClass);
        }
    };

    // PUBLIC API: getIcon
    // ================================
    MyRunsIconPicker.prototype.getIcon = function() {
        return this.currentIcon;
    };

    // PUBLIC API: destroy
    // ================================
    MyRunsIconPicker.prototype.destroy = function() {
        this.$element.off('.myrunsiconpicker');

        if (this.bootstrapModal) {
            this.bootstrapModal.dispose();
            this.bootstrapModal = null;
        }

        this.$modal.remove();
        this.$element.removeData('myrunsiconpicker');
    };

    // JQUERY PLUGIN DEFINITION
    // ================================
    $.fn.myrunsIconPicker = function(option) {
        return this.each(function() {
            const $this = $(this);
            let data = $this.data('myrunsiconpicker');
            const options = typeof option === 'object' && option;

            if (!data) {
                data = new MyRunsIconPicker(this, options);
                $this.data('myrunsiconpicker', data);
            }

            if (typeof option === 'string') {
                data[option]();
            }
        });
    };

    $.fn.myrunsIconPicker.Constructor = MyRunsIconPicker;

})(jQuery);
