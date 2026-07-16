import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("advertising-package");
const generated = "C:/Users/LincolnJones/.codex/generated_images/019f6b9c-2b32-7713-89c6-684ee088aecb";
const campaigns = [
  { folder:"01_Brand_Introduction", slug:"brand-introduction", headline:"BREEZY CUTS", support:"Fresh Cuts. Easy Booking.", cta:"BOOK NOW", feed:"exec-3002dd70-447a-4a7a-8f4f-e46a2bae9581.png", vertical:"exec-86c658e5-1af4-4e0d-bdf4-101d02d9d08e.png", square:"exec-78e633f4-be37-4526-b608-f9ccada4f8fd.png", textfree:"exec-0c23b8a2-9ba6-471c-9a3c-198242a88477.png", alt:"Confident adult customer with a fresh haircut in a modern barber setting beside Breezy Cuts branding and a Book Now message." },
  { folder:"02_Book_Now", slug:"online-booking", headline:"YOUR NEXT FRESH CUT STARTS HERE", support:"Easy online booking. Professional service.", cta:"BOOK YOUR CUT", feed:"exec-991cba74-ad25-426c-bc9f-78821de6fba5.png", vertical:"exec-d0427ad6-7f3b-47e1-96ac-2db5a7add729.png", square:"exec-e7684042-9861-41ea-8bf2-7be0c99ee9d6.png", textfree:"exec-a272e6ed-0919-41d5-bdb9-0ed996e9398a.png", alt:"Adult customer using a phone to schedule a haircut while a barber works in a clean modern shop." },
  { folder:"03_Service_Spotlight", slug:"service-spotlight", headline:"CLEAN CUTS. SHARP DETAILS.", support:"Haircuts • Fades • Tapers • Beard Trims", cta:"VIEW SERVICES", feed:"exec-8b57ced5-26a9-499b-a995-82d2a2043754.png", vertical:"exec-fc78ed80-5fdf-4289-929a-37f18f910694.png", square:"exec-b2454643-859b-437e-bf5c-4af0fc3e6196.png", textfree:"exec-63135530-ccc3-45aa-ba4b-8177276b48c3.png", alt:"Barber refining a precise fade on an adult customer with service text for haircuts, fades, tapers, and beard trims." },
  { folder:"04_Availability_or_Walk_In", slug:"find-appointment", headline:"FIND YOUR NEXT APPOINTMENT", support:"Choose a time that fits your schedule.", cta:"CHECK AVAILABILITY", feed:"exec-9bac912d-5b15-4a85-af87-db21edc34ecb.png", vertical:"exec-32f8a194-6bfb-4460-9d5a-4ff4aeba83f3.png", square:"exec-453999ff-ddb7-42f2-b11a-82e29759cf04.png", textfree:"exec-d820a2be-bbed-4416-be97-c4515be0cdab.png", alt:"Welcoming barber chair and professional barber greeting an adult customer with text inviting viewers to find an appointment." },
  { folder:"05_Offer_or_Retargeting", slug:"retargeting", headline:"STILL THINKING ABOUT THAT FRESH CUT?", support:"Your next appointment is only a few taps away.", cta:"FINISH BOOKING", feed:"exec-cf7744ea-8709-418f-a9a6-7e879c972599.png", vertical:"exec-431f9b9d-b39e-410d-bc5c-c9910e093942.png", square:"exec-4e019d53-264f-4d7e-b8df-83f2677fce55.png", textfree:"exec-a916226b-87db-4965-820f-35c8132b3971.png", alt:"Confident adult with a polished fresh haircut beside a Breezy Cuts message inviting viewers to finish booking." },
];

const specs = [
  ["facebook-feed-4x5-a", "feed", 1440,1800], ["instagram-feed-4x5-a","feed",1440,1800],
  ["facebook-square-1x1-a","square",1080,1080], ["instagram-square-1x1-a","square",1080,1080],
  ["facebook-story-reel-9x16-b","vertical",1440,2560], ["instagram-story-reel-9x16-b","vertical",1440,2560],
  ["tiktok-vertical-9x16-b","vertical",1080,1920], ["snapchat-single-9x16-b","vertical",720,1280],
  ["snapchat-high-resolution-master-b","vertical",1080,1920], ["text-free-master-4x5","textfree",1440,1800],
  ["dark-background-variation-a","feed",1440,1800], ["light-background-variation-b","square",1080,1080],
];

async function exportFormats(input, base, width, height) {
  const pipeline = sharp(input).resize(width,height,{fit:"cover",position:"centre"});
  await pipeline.clone().png({compressionLevel:9}).toFile(`${base}.png`);
  await pipeline.clone().jpeg({quality:92,mozjpeg:true}).toFile(`${base}.jpg`);
  await pipeline.clone().webp({quality:90}).toFile(`${base}.webp`);
}

function sourceSvg(c) {
  const headline = c.headline.replaceAll("&","&amp;");
  const support = c.support.replaceAll("&","&amp;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1800" viewBox="0 0 1440 1800">
  <title>Editable Breezy Cuts ${c.slug} source</title>
  <g id="background-photo"><image href="text-free-master-4x5.png" width="1440" height="1800" preserveAspectRatio="xMidYMid slice"/></g>
  <g id="headline" font-family="Arial, Helvetica, sans-serif" font-weight="800" fill="#FFFFFF"><text x="95" y="250" font-size="102">${headline}</text></g>
  <g id="support" font-family="Arial, Helvetica, sans-serif" fill="#DDF6F5"><text x="95" y="390" font-size="42">${support}</text></g>
  <g id="cta"><rect x="95" y="470" width="420" height="112" rx="10" fill="#21B8B5"/><text x="305" y="540" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="800" fill="#0B1F33">${c.cta}</text></g>
  <g id="safe-zone" visibility="hidden"><rect x="72" y="90" width="1296" height="1530" fill="none" stroke="#FF00FF" stroke-width="4" stroke-dasharray="20 12"/></g>
</svg>`;
}

for (const c of campaigns) {
  const dir = path.join(root,c.folder);
  const assets = path.join(dir,"assets");
  await mkdir(assets,{recursive:true});
  for (const [name,key,w,h] of specs) await exportFormats(path.join(generated,c[key]),path.join(assets,`breezy-cuts-${c.slug}-${name}`),w,h);
  for (let slide=1;slide<=5;slide++) {
    const source = slide===1||slide===5?c.vertical:slide===2?c.feed:slide===3?c.square:c.textfree;
    await exportFormats(path.join(generated,source),path.join(assets,`breezy-cuts-${c.slug}-tiktok-carousel-slide-${slide}`),1080,1920);
  }
  for (let frame=1;frame<=4;frame++) {
    const source = frame===1?c.feed:frame===2?c.square:frame===3?c.textfree:c.vertical;
    await exportFormats(path.join(generated,source),path.join(assets,`breezy-cuts-${c.slug}-snapchat-story-frame-${frame}`),720,1280);
  }
  await writeFile(path.join(dir,"editable-layered-source.svg"),sourceSvg(c));
  await writeFile(path.join(dir,"motion-ready.json"),JSON.stringify({canvas:{width:1080,height:1920},durationSeconds:12,layers:[{name:"background",source:`assets/breezy-cuts-${c.slug}-tiktok-vertical-9x16-b.png`,in:0,out:12},{name:"brand-reveal",text:"Breezy Cuts",in:0,out:2},{name:"headline",text:c.headline,in:2,out:8},{name:"support",text:c.support,in:5,out:8},{name:"cta",text:c.cta,in:8,out:12}],safeZones:{top:180,right:150,bottom:330,left:72}},null,2));
  await writeFile(path.join(dir,"seo-metadata.json"),JSON.stringify({campaign:c.slug,temporaryWordmark:true,aiGeneratedCampaignArtwork:true,altText:c.alt,imageTitle:c.headline,filenamePattern:`breezy-cuts-${c.slug}-[platform]-[format]-[variation].[ext]`,formats:specs.map(([name,,width,height])=>({name,width,height})),landingPageRecommendation:"Use the matching Breezy Cuts campaign landing page after its URL and business data are verified.",unverifiedOmissions:["city","address","phone","hours","booking URL","website URL","walk-in policy","offer","prices","reviews","ratings"]},null,2));
}

const thumbs=[];
for (let i=0;i<campaigns.length;i++) {
  const c=campaigns[i];
  const input=path.join(root,c.folder,"assets",`breezy-cuts-${c.slug}-instagram-square-1x1-a.png`);
  thumbs.push({input:await sharp(input).resize(500,500).toBuffer(),left:(i%3)*520,top:Math.floor(i/3)*520});
}
await sharp({create:{width:1560,height:1040,channels:3,background:"#0B1F33"}}).composite(thumbs).png().toFile(path.join(root,"breezy-cuts-campaign-contact-sheet.png"));
await sharp(path.join(root,"breezy-cuts-campaign-contact-sheet.png")).jpeg({quality:92}).toFile(path.join(root,"breezy-cuts-campaign-contact-sheet.jpg"));
await writeFile(path.join(root,"package-manifest.json"),JSON.stringify({generatedAt:new Date().toISOString(),concepts:campaigns.length,platforms:["facebook","instagram","tiktok","snapchat"],sourceMode:"OpenAI built-in image generation plus deterministic format conversion",notes:["Wordmark is a draft.","AI-generated people are campaign artwork, not real customers.","Replace placeholder booking URLs before publishing."]},null,2));
console.log("Advertising package exports complete.");
