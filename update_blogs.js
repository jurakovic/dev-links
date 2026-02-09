const fs = require('fs');

// Read files
const blogsJson = JSON.parse(fs.readFileSync('blogs.json', 'utf8'));

// Mapping based on README.md structure
const mapping = {
  'microservices': { Author: 'Chris Richardson', Name: 'Microservices.io' },
  'developertoarchitect': { Author: 'Mark Richards', Name: 'Software Developer To Software Architect' },
  'ardalis': { Author: 'Steve Smith', Name: 'Ardalis' },
  'hanselman': { Author: 'Scott Hanselman', Name: '' },
  'andrewlock': { Author: 'Andrew Lock', Name: '.NET Escapades' },
  'davecallan': { Author: 'Dave Callan', Name: '.NET, VS, EF' },
  'stephencleary': { Author: 'Stephen Cleary', Name: '' },
  'jonskeet': { Author: 'Jon Skeet', Name: '' },
  'jimmybogard': { Author: 'Jimmy Bogard', Name: '' },
  'devlead': { Author: 'Mattias Karlsson', Name: 'devlead' },
  'steven-giesel': { Author: 'Steven Giesel', Name: '' },
  'adamsitnik': { Author: 'Adam Sitnik', Name: '.NET Performance and Reliability' },
  'minidump': { Author: 'Kevin Gosse', Name: 'minidump.net' },
  'mattwarren': { Author: 'Matt Warren', Name: 'Performance is a Feature!' },
  'haacked': { Author: 'Phil Haack', Name: 'You\'ve Been Haacked' },
  'erikej': { Author: 'Erik Ejlskov Jensen', Name: '.NET Data Access and more' },
  'enterprisecraftsmanship': { Author: 'Vladimir Khorikov', Name: 'Enterprise Craftsmanship' },
  'martinfowler': { Author: 'Martin Fowler', Name: '' },
  'antirez': { Author: 'Salvatore Sanfilippo', Name: 'antirez' },
  'simonwillison': { Author: 'Simon Willison', Name: '' },
  'nickcraver': { Author: 'Nick Craver', Name: 'Software Imagineering' },
  'codinghorror': { Author: 'Jeff Atwood', Name: 'Coding Horror' },
  'joelonsoftware': { Author: 'Joel Spolsky', Name: 'Joel on Software' },
  'neilonsoftware': { Author: 'Neil Green', Name: 'Neil on Software' },
  'brendangregg': { Author: 'Brendan Gregg', Name: 'Systems Performance' },
  'tidyfirst': { Author: 'Kent Beck', Name: 'Software Design: Tidy First?' },
  'paulhammant': { Author: 'Paul Hammant', Name: 'CTO, Trunk-Based Development expert' },
  'sizovs': { Author: 'Eduards Sizovs', Name: 'The Principal Developer' },
  'bartwullems': { Author: 'Bart Wullems', Name: 'The Art of Simplicity' },
  'pragmaticengineer': { Author: 'Gergely Orosz', Name: 'The Pragmatic Engineer' },
  'vadimkravcenko': { Author: 'Vadim Kravcenko', Name: 'CTO' },
  'thecodist': { Author: 'Andrew Wulf', Name: 'The Codist' },
  'terriblesoftware': { Author: 'Matheus Lima', Name: 'Terrible Software' },
  'lethain': { Author: 'Will Larson', Name: 'Irrational Exuberance' },
  'effectiveengineer': { Author: 'Edmond Lau', Name: 'The Effective Engineer' },
  'dotnet': { Author: '', Name: '.NET Blog' },
  'visualstudio': { Author: '', Name: 'Visual Studio Blog' },
  'visualstudiomagazine': { Author: '', Name: 'Visual Studio Magazine' },
  'stackoverflow': { Author: '', Name: 'The Stack Overflow Blog' },
  'github': { Author: '', Name: 'The GitHub Blog: Engineering' },
  'netflix': { Author: '', Name: 'Netflix TechBlog' },
  'slack': { Author: '', Name: 'Engineering at Slack' }
};

// Update each blog entry with fields in specific order
const updatedBlogs = blogsJson.map(blog => {
  const info = mapping[blog.title] || { Author: '', Name: '' };
  return {
    author: info.Author,
    name: info.Name,
    title: blog.title,
    htmlUrl: blog.htmlUrl,
    feedUrl: blog.feedUrl,
    category: blog.category,
    icon: blog.icon
  };
});

// Save with proper formatting
fs.writeFileSync('blogs.json', JSON.stringify(updatedBlogs, null, 2));
console.log('blogs.json has been updated with Author and Name fields');
