const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const C = require("./user");
const fs = require("fs");
const CronJob = require("cron").CronJob;
const nodemailer = require("nodemailer");
const USERNAME_SELECTOR = "#OtherUsername";
const PASSWORD_SELECTOR = "#OtherPassword";
const CTA_SELECTOR = "#btnSend";
const url ="https://obs.duzce.edu.tr/student/lessongradebystudent";

//Site bağlantısı, ayarlamalar
async function configureBrowser(){
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.goto(url);
    await page.click(USERNAME_SELECTOR);
    await page.keyboard.type(C.username);
    await page.click(PASSWORD_SELECTOR);
    await page.keyboard.type(C.password);
    await page.click(CTA_SELECTOR);

    await page.waitForNavigation();
    await page.setViewport({width:1920, height:1080});
    
    await page.addStyleTag({content: '.noteview-survey{display:none;}'});
    await page.screenshot({path:"obsLogin.png"});
    return page;
}

//Kontrol et
async function checkMark(page,tmpNot){

    //await page.reload();
    let html = await page.evaluate(()=>document.body.innerHTML); //body html kodunu çekiyor
    let $ = cheerio.load(html); //kaynak gösterildi

    let main= $(".font-green-sharp"); //parent
    let notOrt = main.children().first().text();//child
    let currentNot = Number(notOrt.replace(/[^0-9.-]+/g,""));//regex
    let tmpAktar= await Promise.resolve(tmpNot); // await yazılmazsa [object Promise] döndürüyor
    console.log("Geçerli ortalama=" + (currentNot/100));
    if(tmpAktar==0){
        tmpAktar=currentNot;
        console.log("Atama islemi yapildi!");
    }

    if(currentNot!=tmpAktar){
        console.log("Ortalama değişti!");

        sendeNotification(currentNot);
        tmpAktar=currentNot;
    }

    await page.reload();

    return tmpAktar;
}

//Takibi başlat
async function startTracking(){
    const page = await configureBrowser();
    let tmpNot=0;
    let job = new CronJob('*/30 * * * * *',function(){
        tmpNot = checkMark(page,tmpNot);
    },null,true,null,null,true);
    job.start();
}

//Mail gönder
async function sendeNotification(not){
    var transporter = nodemailer.createTransport({
        service: "outlook",
        auth:{
            user: "enescakkr@windowslive.com", //gönderici
            pass: "Enes_365414"
        }
    });

    let textToSend = "Genel ortalama değişti, yeni ortalama="+not;
    let htmlText = `<a href=\"${url}\">Notları Görmek İçin Tıklayın</a>`;

    let info = await transporter.sendMail({
       from: '"Genel ortalama değişti, yeni ortalama="+not <enescakkr@windowslive.com>',
       to:"pilavlivar5@gmail.com",//alıcı
       subject: "Genel ortalama değişti, yeni ortalama="+not,
       text: textToSend,
       html: htmlText,
       attachments:
       {
           filename: 'obsLogin.png',
           content: fs.createReadStream("C:/Users/DELL/Desktop/ObsNotOrtalamasi/obsLogin.png")
       }
    });

    console.log("Message sent: %s",info.messageId);
}

startTracking();
/*
async function monitor(){
    let page = await configureBrowser();
    await checkPrice(page);
}

monitor();
*/