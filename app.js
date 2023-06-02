require("dotenv").config();
const Koa = require("koa");
const KoaRouter = require("@koa/router");
const cors = require("koa2-cors");
const bodyParser = require("koa-bodyparser");
const SpotifyWebApi = require("spotify-web-api-node");
const Genius = require("genius-lyrics");

// genius client key(but not use!)
const Client = new Genius.Client(
  "EZzPP025zvnluAZ2uFpQCaaRCvaycCr7pnbqsneqMKw1tB65si0OYL-oxxPmV1zX"
);
// 创建app对象
const app = new Koa();

// cors跨域插件
app.use(cors());
// 使用第三方库解析post数据
app.use(bodyParser());

const rootRouter = new KoaRouter({ prefix: "/api" });

// 注册路由对象:并传入前缀
const loginRouter = new KoaRouter({ prefix: "/login" });
const refreshRouter = new KoaRouter({ prefix: "/refresh" });
const searchRouter = new KoaRouter({ prefix: "/search" });

// 刷新token
refreshRouter.post("/", async (ctx, next) => {
  const refreshToken = ctx.request.body.refreshToken;
  console.log(refreshToken);
  const spotifyApi = new SpotifyWebApi({
    redirectUri: process.env.REDIRECT_URI,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken,
  });
  try {
    const res = await spotifyApi.refreshAccessToken();
    ctx.body = {
      code: 0,
      data: [
        {
          accessToken: res.body.access_token,
          expiresIn: res.body.expires_in,
        },
      ],
    };
  } catch (error) {
    ctx.response.status = 400;
  }
});

// login 登录获取token,refreshToken,以及过期时间
loginRouter.post("/", async (ctx, next) => {
  const code = ctx.request.body.code;
  const spotifyApi = new SpotifyWebApi({
    redirectUri: process.env.REDIRECT_URI,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
  });
  try {
    const res = await spotifyApi.authorizationCodeGrant(code);
    ctx.body = {
      code: 0,
      data: [
        {
          accessToken: res.body.access_token,
          refreshToken: res.body.refresh_token,
          expiresIn: res.body.expires_in,
        },
      ],
    };
  } catch (error) {
    ctx.response.status = 400;
    ctx.body = error;
  }
});

searchRouter.get("/lyrics", async (ctx, next) => {
  const artist = ctx.query.artist;
  const track = ctx.query.track;
  const searches = await Client.songs.search(track);
  const firstSong = searches.filter((item) =>
    artist.includes(item.artist.name)
  );
  try {
    const lyrics =
      firstSong.length > 0 ? await firstSong[0].lyrics() : "Not Lyrics";
    ctx.body = {
      code: 0,
      data: [{ lyrics }],
    };
  } catch (error) {
    ctx.response.status = 409;
  }
});

// 让路由中间件生效
rootRouter.use(loginRouter.routes());
rootRouter.use(refreshRouter.routes());
rootRouter.use(searchRouter.routes());
// 检测method是否包含的方法
rootRouter.use(loginRouter.allowedMethods());
rootRouter.use(refreshRouter.allowedMethods());
rootRouter.use(searchRouter.allowedMethods());

app.use(rootRouter.routes(), rootRouter.allowedMethods());

// 启动服务器
app.listen(3001, () => {
  console.log("koa服务器启动成功~");
});
