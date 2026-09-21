<?php
/**
 * Custom Navigation Walker
 *
 * @package Expert_Tech_BD
 */

if (!defined('ABSPATH')) {
    exit;
}

// Walker class is defined in functions.php
// This file can be used for additional menu customizations

/**
 * Add menu item icons
 */
function expert_tech_menu_item_icons($items, $args) {
    foreach ($items as &$item) {
        // Check for custom icon class
        if (in_array('menu-icon-home', $item->classes)) {
            $item->title = '<i class="fas fa-home"></i> ' . $item->title;
        }
    }
    return $items;
}
// add_filter('wp_nav_menu_objects', 'expert_tech_menu_item_icons', 10, 2);

/**
 * Add menu description
 */
function expert_tech_menu_description($item_output, $item, $depth, $args) {
    if ($item->description && $depth == 0) {
        $item_output = str_replace(
            '</a>',
            '<span class="menu-description">' . $item->description . '</span></a>',
            $item_output
        );
    }
    return $item_output;
}
// add_filter('walker_nav_menu_start_el', 'expert_tech_menu_description', 10, 4);

/**
 * Add data attributes to menu items
 */
function expert_tech_menu_item_attrs($atts, $item, $args, $depth) {
    // Add data-menu-id attribute
    $atts['data-menu-id'] = $item->ID;

    return $atts;
}
add_filter('nav_menu_link_attributes', 'expert_tech_menu_item_attrs', 10, 4);

/**
 * Mega Menu Walker (for future use)
 */
class Expert_Tech_Mega_Menu_Walker extends Walker_Nav_Menu {
    private $mega_menu_enabled = false;
    private $column_count = 0;

    public function start_lvl(&$output, $depth = 0, $args = null) {
        $indent = str_repeat("\t", $depth);

        if ($depth === 0 && $this->mega_menu_enabled) {
            $output .= "\n$indent<div class=\"mega-menu-wrapper\">\n";
            $output .= "$indent<div class=\"mega-menu-inner\">\n";
        }

        $output .= "\n$indent<ul class=\"sub-menu depth-$depth\">\n";
    }

    public function end_lvl(&$output, $depth = 0, $args = null) {
        $indent = str_repeat("\t", $depth);
        $output .= "$indent</ul>\n";

        if ($depth === 0 && $this->mega_menu_enabled) {
            $output .= "$indent</div>\n";
            $output .= "$indent</div>\n";
        }
    }

    public function start_el(&$output, $item, $depth = 0, $args = null, $id = 0) {
        // Check if this is a mega menu parent
        if ($depth === 0 && in_array('mega-menu', (array) $item->classes)) {
            $this->mega_menu_enabled = true;
        }

        // Check for column markers
        if ($depth === 1 && in_array('mega-menu-column', (array) $item->classes)) {
            $this->column_count++;
        }

        parent::start_el($output, $item, $depth, $args, $id);
    }

    public function end_el(&$output, $item, $depth = 0, $args = null) {
        if ($depth === 0) {
            $this->mega_menu_enabled = false;
            $this->column_count = 0;
        }

        $output .= "</li>\n";
    }
}
