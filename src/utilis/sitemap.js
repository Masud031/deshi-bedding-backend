const { SitemapStream, streamToPromise } = require('sitemap');
const { Readable } = require('stream');

app.get('/sitemap.xml', async (req, res) => {
  try {
    // 1. Fetch all your products from MongoDB/Database
    const products = await Product.find({}, 'id category'); 

    // 2. Define your static pages
    const links = [
      { url: '/', changefreq: 'daily', priority: 1.0 },
      { url: '/shop', changefreq: 'daily', priority: 0.8 },
      { url: '/category/panjabi', changefreq: 'weekly', priority: 0.7 },
    ];

    // 3. Add dynamic product pages to the links array
    products.forEach(product => {
      links.push({
        url: `/shop/${product._id}`, // Matches your React route
        changefreq: 'weekly',
        priority: 0.6
      });
    });

    // 4. Create the XML
    const stream = new SitemapStream({ hostname: 'https://bdhabibi.com' });
    res.header('Content-Type', 'application/xml');
    
    const xml = await streamToPromise(Readable.from(links).pipe(stream)).then(data => data.toString());
    res.send(xml);

  } catch (error) {
    res.status(500).send("Error generating sitemap");
  }
});