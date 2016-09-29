module.exports = {
    get : function(url) {
      return new Promise(function(resolve, reject) {
        d3.json(url, function(error, res){
          if (error) reject(error);
          resolve(res);
        })
      });
    }
}

