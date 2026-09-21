<?php
/**
 * The sidebar containing the main widget area
 *
 * @package Expert_Tech_BD
 */

if (!is_active_sidebar('sidebar-main')) {
    return;
}
?>

<aside id="secondary" class="sidebar widget-area">
    <?php dynamic_sidebar('sidebar-main'); ?>
</aside>
