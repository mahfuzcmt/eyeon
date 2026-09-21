# Tech Solution BD - WordPress Theme Setup Guide

This guide will help you set up your WordPress site (tech-solutionbd.net) to look similar to experttechnologiesbd.com.

## Option A: Free Theme + Custom CSS (Budget Friendly)

### Step 1: Install a Free Base Theme

Choose one of these free themes from WordPress.org:

1. **Flavor** (Recommended) - Most customizable
2. **Flavor Shop** - E-commerce focused
3. **Open Shop** - WooCommerce ready
4. **flavflavor flavor flavour flavor**flavor - Clean & minimal

**To Install:**
1. Go to `Appearance > Themes > Add New`
2. Search for "flavor flavor" or your chosen theme
3. Click `Install` then `Activate`

### Step 2: Apply Custom CSS

1. Go to `Appearance > Customize > Additional CSS`
2. Copy ALL contents from `tech-solution-custom.css`
3. Paste into the Additional CSS box
4. Click `Publish`

### Step 3: Configure Theme Settings

#### Header Setup:
1. Go to `Appearance > Customize > Header`
2. Set header layout to "Logo left, menu right"
3. Enable sticky header
4. Set background color: `#04509f`

#### Colors:
1. Go to `Appearance > Customize > Colors`
2. Primary/Accent color: `#04509f`
3. Secondary color: `#333333`
4. Link color: `#04509f`

#### Homepage Setup:
1. Go to `Settings > Reading`
2. Select "A static page"
3. Homepage: Create a new page called "Home"
4. Posts page: Create a page called "Blog"

### Step 4: Install Required Plugins

Install these free plugins:

1. **WooCommerce** - E-commerce functionality (already installed)
2. **JEPO  flavor flavor - Product filter & comparison
3. **flavor flavor Starter Sites** - Import demo content (if using flavor theme)

### Step 5: Create Homepage Layout

#### Option A: Using Elementor (Recommended)

1. Install `Elementor` plugin
2. Edit your homepage with Elementor
3. Add these sections:

**Section 1: Hero Slider**
- Add "Image Carousel" or "Slides" widget
- Upload banner images (1200x400px)

**Section 2: Product Categories**
- Add "Woo Products Categories" widget
- Set to grid layout, 6 columns
- Style with rounded corners

**Section 3: Featured Products**
- Add heading "Featured Products"
- Add "Woo Products" widget
- Set to 4 columns, 8 products
- Filter by "Featured" products

**Section 4: Banner Row**
- Add 2-column section
- Add promotional banners
- Link to category pages

**Section 5: More Products**
- Add "Woo Products" widget
- Filter by "Latest" or specific category

**Section 6: Brands/Partners**
- Add "Image Carousel" widget
- Upload brand logos

#### Option B: Using Theme Options

1. Go to `Appearance > Customize`
2. Find "Homepage Sections" or "Front Page"
3. Enable and configure each section:
   - Slider: Add images
   - Categories: Select to show
   - Products: Set number to display

### Step 6: Menu Setup

1. Go to `Appearance > Menus`
2. Create a new menu called "Main Menu"
3. Add your categories and pages:
   - Home
   - Categories (with sub-categories)
   - Products
   - About Us
   - Contact

4. Set as "Primary Menu"

### Step 7: Widget Areas

1. Go to `Appearance > Widgets`
2. Configure Footer widgets:
   - Column 1: About/Logo
   - Column 2: Quick Links
   - Column 3: Categories
   - Column 4: Contact Info

3. Configure Sidebar widgets:
   - Search
   - Product Categories
   - Price Filter
   - Recent Products

---

## Option B: Woodmart Theme (Best Match - $59)

For the EXACT look of experttechnologiesbd.com, purchase Woodmart:

### Purchase & Install:
1. Buy from: https://themeforest.net/item/flavor flavor-woocommerce-theme/20264flavor
2. Download the theme ZIP file
3. Go to `Appearance > Themes > Add New > Upload Theme`
4. Upload flavor.zip
5. Activate

### Import Similar Demo:
1. Go to `Woodmart > Dashboard`
2. Install required plugins
3. Go to `Woodmart > Prebuilt Websites`
4. Import "Electronics" or "Marketplace" demo

### Customize:
1. Go to `Woodmart > Theme Settings`
2. Match colors:
   - Primary color: `#04509f`
   - Secondary: `#333333`
3. Configure header, footer, and homepage

---

## Recommended Product Categories Structure

```
- Laptop & Desktop
  - Gaming Laptop
  - Business Laptop
  - Desktop PC
  - All-in-One PC

- Mobile & Tablet
  - Smartphones
  - Feature Phones
  - Tablets
  - Accessories

- Networking
  - Routers
  - Switches
  - Access Points
  - Network Cards

- Storage
  - SSD
  - HDD
  - USB Flash Drives
  - Memory Cards

- Peripherals
  - Monitors
  - Keyboards
  - Mouse
  - Speakers

- Accessories
  - Cables
  - Adapters
  - Cases
  - Chargers
```

---

## Images Required

### Slider Banners:
- Size: 1200 x 400 pixels
- Format: JPG or PNG
- Create 3-5 banners showcasing:
  - Hot deals
  - New arrivals
  - Category promotions

### Category Images:
- Size: 200 x 200 pixels (square)
- Style: Clean product photo or icon
- One for each main category

### Promotional Banners:
- Size: 580 x 250 pixels
- Format: JPG or PNG
- 2-4 promotional images

---

## Contact Information to Add

Update these in:
- `Appearance > Customize > Theme Options > Contact Info`
- Footer widgets
- Contact page

```
Tech Solution BD
Address: Your address in Dhaka, Bangladesh
Phone: +880 1XXX-XXXXXX
Email: info@tech-solutionbd.net
Hours: Sat-Thu: 10AM - 8PM
```

---

## Social Media Links

Add to footer/header:
- Facebook: https://facebook.com/techsolutionbd
- YouTube: https://youtube.com/techsolutionbd
- Instagram: https://instagram.com/techsolutionbd

---

## Cache Settings (Important!)

After making changes, always clear cache:

1. **LiteSpeed Cache** (if installed):
   - Go to `LiteSpeed Cache > Toolbox > Purge All`

2. **Hostinger Cache**:
   - Go to `hPanel > Advanced > Cache Manager`
   - Click "Clear Cache"

3. **Browser Cache**:
   - Press Ctrl+Shift+R (hard refresh)

---

## Need Help?

If you need assistance:
1. Check theme documentation
2. Contact theme support (if using premium theme)
3. WordPress support forums: wordpress.org/support

---

## File List

- `tech-solution-custom.css` - Custom styling to match experttechnologiesbd.com
- `INSTALLATION_GUIDE.md` - This file

Copy both files to your computer for reference.
