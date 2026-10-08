export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "www.davit.cc") {
      url.hostname = "davit.cc";
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
