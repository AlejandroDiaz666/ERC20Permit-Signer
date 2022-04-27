//
// this is a simple wrapper around a promise that eliminates the need for a try,catch block
// when using await semantics. for example, if you had:
//
//   try {
//     await data = promiseFcn(parm);
//   } catch (error) {
//     handleError(error);
//   }
//
// you could replace that with:
//
//   [error, data] = await to.handle(promiseFcn(parm));
//   if(!!error)
//       handleError(error);
//
const to = module.exports = {
    handle: function(promise) {
	return(promise
	       .then(data => {
		   return([null, data]);
	       })
	       .catch(err => {
		   return([err, undefined]);
	       })
	      );
    },
};
