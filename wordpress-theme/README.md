# Expert Tech BD - WordPress Theme & Plugin

A complete WordPress theme and plugin solution for security equipment, GPS tracking, and technology businesses in Bangladesh. Inspired by Expert Technologies BD, this theme is optimized for WooCommerce e-commerce with Bengali localization support.

## Features

### Theme Features
- Modern, responsive design optimized for e-commerce
- Full WooCommerce integration with product quick view
- Live AJAX search with instant results
- Hero slider with multiple slides support
- Product category showcase
- Featured products grid
- Brands carousel
- Bengali language support (bn-BD)
- Mobile-first responsive design
- Sticky header with smart hide on scroll
- Back to top button
- Newsletter subscription
- Social media integration
- Multiple widget areas
- Customizer integration for easy settings

### Plugin Features
- Custom Post Types: Testimonials, Team, FAQs, Brands, Sliders
- Shortcodes for all custom content
- Admin settings panel
- Custom widgets: Products, Contact Info, Social Links, Opening Hours
- WooCommerce product custom fields (Warranty, Model Number, BTRC Approved)

## Requirements

- WordPress 6.0 or higher
- PHP 8.0 or higher
- WooCommerce 8.0 or higher (recommended)

## Installation

### Theme Installation

1. Download or clone the `expert-tech-theme` folder
2. Go to WordPress Admin > Appearance > Themes > Add New > Upload Theme
3. Select the zip file or folder
4. Activate the theme

Or manually:
```bash
# Copy to wp-content/themes/
cp -r expert-tech-theme /path/to/wordpress/wp-content/themes/
```

### Plugin Installation

1. Download or clone the `expert-tech-plugin` folder
2. Go to WordPress Admin > Plugins > Add New > Upload Plugin
3. Select the zip file or folder
4. Activate the plugin

Or manually:
```bash
# Copy to wp-content/plugins/
cp -r expert-tech-plugin /path/to/wordpress/wp-content/plugins/
```

## Configuration

### Customizer Settings

Go to **Appearance > Customize** to configure:

1. **Contact Information**
   - Phone Number
   - Email Address
   - Address
   - WhatsApp Link

2. **Social Media Links**
   - Facebook
   - Twitter
   - Instagram
   - LinkedIn
   - YouTube

3. **Theme Colors**
   - Primary Color (default: #04509f)
   - Secondary Color (default: #29b2e8)
   - Accent Color (default: #ff6b35)

4. **Header Settings**
   - Enable Sticky Header
   - Show Top Bar

5. **Footer Settings**
   - Footer About Text
   - Copyright Text
   - Developer Credit

6. **Shop Settings** (WooCommerce)
   - Products Per Page
   - Products Per Row
   - Show Shop Sidebar

### Plugin Settings

Go to **Expert Tech > Settings** in the admin menu to configure:
- Contact Information
- Social Media Links

### Menu Setup

Create menus in **Appearance > Menus**:

1. **Primary Menu** - Main navigation (displayed in header)
2. **Top Bar Menu** - Links for top bar (About, Contact, FAQs, etc.)
3. **Footer Menu 1** - Quick links
4. **Footer Menu 2** - Customer service links
5. **Mobile Menu** - Mobile navigation

### Widget Areas

The theme includes these widget areas:
- Main Sidebar
- Shop Sidebar (for WooCommerce)
- Footer Widget 1-4

## Shortcodes

### Products Grid
```
[expert_products limit="8" columns="4" category="security" featured="true"]
```
Parameters:
- `limit` - Number of products (default: 8)
- `columns` - Grid columns (default: 4)
- `category` - Category slug(s), comma-separated
- `orderby` - Order by field
- `order` - ASC or DESC
- `featured` - Show featured only (true/false)
- `on_sale` - Show on-sale only (true/false)

### Categories Grid
```
[expert_categories limit="6" columns="6" parent="0"]
```

### Brands Carousel
```
[expert_brands limit="-1"]
```

### Contact Info
```
[expert_contact]
```

### FAQ Accordion
```
[expert_faq category="general" limit="10"]
```

### Testimonials
```
[expert_testimonials limit="4" columns="2"]
```

### Team Grid
```
[expert_team limit="4" columns="4" department="sales"]
```

## Custom Post Types

### Testimonials
Add customer testimonials with:
- Customer name (title)
- Testimonial text (content)
- Customer photo (featured image)
- Position (custom field: `_testimonial_position`)

### Team Members
Add team members with:
- Name (title)
- Bio (content)
- Photo (featured image)
- Position (custom field: `_team_position`)
- Department (taxonomy)

### FAQs
Add frequently asked questions with:
- Question (title)
- Answer (content)
- FAQ Category (taxonomy)

### Brands
Add brand logos with:
- Brand name (title)
- Logo (featured image)

### Sliders
Add hero slider slides with:
- Title
- Subtitle (custom field)
- Description (custom field)
- Button Text (custom field)
- Button URL (custom field)
- Background Image (featured image)

## WooCommerce Integration

The theme is fully integrated with WooCommerce:

- Custom product cards with quick view
- AJAX add to cart
- Product badges (Sale, New)
- Rating display
- Category display on product cards
- Custom checkout styling
- BDT currency symbol (৳)
- Default country set to Bangladesh

### Custom Product Fields
Added via plugin:
- Warranty Period
- Model Number
- BTRC Approved checkbox

## File Structure

```
expert-tech-theme/
├── style.css               # Main stylesheet
├── functions.php           # Theme functions
├── header.php              # Header template
├── footer.php              # Footer template
├── index.php               # Main template
├── front-page.php          # Homepage template
├── page.php                # Page template
├── single.php              # Single post template
├── archive.php             # Archive template
├── search.php              # Search results template
├── 404.php                 # 404 error template
├── sidebar.php             # Sidebar template
├── inc/
│   ├── customizer.php      # Customizer settings
│   ├── woocommerce.php     # WooCommerce integration
│   ├── template-functions.php
│   ├── template-tags.php
│   └── walker-nav-menu.php
├── assets/
│   ├── css/
│   │   └── custom.css
│   ├── js/
│   │   └── main.js
│   ├── images/
│   │   ├── brands/         # Brand logos
│   │   └── payments/       # Payment method icons
│   └── fonts/
└── woocommerce/            # WooCommerce template overrides

expert-tech-plugin/
└── expert-tech-plugin.php  # Main plugin file
```

## Customization

### Adding Brand Logos
Place brand logo images in:
```
expert-tech-theme/assets/images/brands/
```
Name format: `brandname.png` (e.g., `hikvision.png`, `dahua.png`)

### Adding Payment Icons
Place payment method icons in:
```
expert-tech-theme/assets/images/payments/
```
Name format: `paymentmethod.png` (e.g., `bkash.png`, `nagad.png`, `visa.png`)

### Custom CSS
Add custom styles to:
```
expert-tech-theme/assets/css/custom.css
```

### Custom JavaScript
Add custom scripts to:
```
expert-tech-theme/assets/js/main.js
```

## Bengali Localization

The theme supports Bengali language. To enable:

1. Go to **Settings > General**
2. Set Site Language to "Bengali (Bangladesh)"

Or add to `wp-config.php`:
```php
define('WPLANG', 'bn_BD');
```

## Recommended Plugins

- **WooCommerce** - E-commerce functionality
- **YITH WooCommerce Wishlist** - Product wishlist
- **WooCommerce Product Compare** - Product comparison
- **Contact Form 7** or **WPForms** - Contact forms
- **Yoast SEO** - SEO optimization
- **UpdraftPlus** - Backups
- **W3 Total Cache** - Performance optimization

## Support

For support, please:
1. Check the documentation above
2. Review the theme code comments
3. Open an issue on the repository

## License

This theme and plugin are licensed under GPL v2 or later.

## Credits

- Inspired by Expert Technologies BD (experttechnologiesbd.com)
- Built with WordPress and WooCommerce
- Uses Font Awesome icons
- Uses Swiper.js for sliders
- Google Fonts: Albert Sans, Urbanist

## Changelog

### 1.0.0
- Initial release
- Full WooCommerce integration
- Custom post types and widgets
- Bengali localization support
- Responsive design
- Hero slider
- Product quick view
- AJAX search and add to cart
