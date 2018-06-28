'use strict';
/**
 * @Description: vue实现路由 vitaplus获取组件
 * @author wenglx 
 * TODO: keep未实现 <keep-alive :include=keepAliveComponent><component :is='view'></component></keep-alive>
 * `
	<transition :name='transitionName'  
			v-on:before-enter="beforeEnter"
			v-on:enter="enter"
			v-on:after-enter="afterEnter"
			v-on:enter-cancelled="enterCancelled"
			v-on:before-leave="beforeLeave"
			v-on:leave="leave"
			v-on:after-leave="afterLeave"
			v-on:leave-cancelled="leaveCancelled">
		<div>
			<keep-alive :include=keepAliveComponent>
				<component :is='view' :nav=nav :props=passProps></component>
			</keep-alive>
			<vue-topprogress ref='topProgress' color='#29d'></vue-topprogress>
			<div id='ssr-load-component'></div>
		</div>
	</transition>`
 */
Vue.component('ssr-route-view', {
	template: "\n\t\t\t<keep-alive :include=keepAliveComponent><component :is='view' :nav=nav :props=passProps></component></keep-alive>\n\t\t\t<vue-topprogress ref='topProgress' color='#29d'></vue-topprogress>\n\t\t\t<div id='ssr-load-component'></div>\n\t\t</div>",
	props: {
		//初始路由
		initView:{
			type : String,
			default : ''
		},
		//过场动画 TODO 默认为fade
		transitionName: {
			type : String,
			default : 'fade'
		},
		//路由列表
		routes: {
			type : Object,
			default : function(){
				return {}
			}
		},
		//参数
		params: {
			type : Object,
			default : function(){
				return {}
			}
		},
	},
	mounted : function() {
		if(this.initView){
			this.navigator.push({route: this.initView});
		}else{
			for(var key in this.routes){
				this.navigator.push({route: key});
				break;
			}
		}
	},
	data: function data() {
		return {
			isSsrRoute:true,
			navigator:[],//路由表,对路由的操作在这里处理
			view:'',
			viewName: '',//当前路由组件编码
			trackRecord:[],//轨迹
			oldNavigator:[],//处理失败时回退
		};
	},
	methods: {
		/**
		 * 提供给外部调用事件
		 */
		//根据属性跳转
		routeByProp:function(targetView){
			this.viewName = targetView;
		},
		/**
		 * navigator数组结构
		 * route: {
		 * 	  route:''//路由
			  componentCode: Function;//组件编码 中横线分隔的
			  url:'',//组件URL
			  passProps?: Object;//传递属性
			}
		 */
		//Navigate forward to a new route
		push:function(route){
			this.navigator.push(route);
		},
		
		//Go back one page 如果是top节点,从route取
		pop:function(route){
			//有目标路由与上级路由一致，直接pop
			if(this.navigator.length>1 && route && route.route 
					&& this.navigator[this.navigator.length-1].route == route.route){
				this.navigator.pop();
			}else if((!route || !route.route) && this.navigator.length>1){
				//没有目标路由且可以加退，则直接pop
				this.navigator.pop();
			}else if(route && route.route){
				//有目标路由，不一致，则push 
				this.navigator.push(route);
			}else{
				console.error('无法路由pop,未找到节点')
			}
		},
		
		//回到某个路由
		backTo:function(){
			var pos = null;
			for(var key in this.navigator){
				if(this.navigator.route == route.route){
					pos = key;
				}
			}
			if(pos){
				this.navigator.splice(pos+1,this.navigator.length-pos);
			}else{
				this.navigator.push(route);
			}
		},
		
		//Replace the route for the current page and immediately load the view for the new route.
		replace:function(route){
			this.navigator.splice(this.navigator.length-1,1,route);
		},
		
		//Go back to the top item
		popToTop:function(){
			this.navigator.splice(1,this.navigator.length-1);
		},
		
		//Replaces the top item and popToTop
		resetTo:function(route){
			this.navigator.splice(0,this.navigator.length,route);
		},
		
		/**
		 * 内部方法
		 */
		
		//路由处理
		doRoute:function(){
			try{
				this.handlePreLoad();
				//获取组件
				var data = Object.assign(this.params,{inFrame:true});
				if(!Vue.options.components[this.componentCode]){
					$("body").append($('<div>').load(this.url,data,this.handlePostLoad));
				}else{
					this.handlePostLoad();
				}
			}catch(err){
				console.error(err)
			}
		},
		
		//加载组件预处理
		handlePreLoad:function(response,status,xhr){
			//progress start
			if(!Vue.options.components[this.componentCode]){
	            try{
	            	if(this.$refs.topProgress ){
	            		this.$refs.topProgress.start();
	            	}
	            }catch(err){
	            }
			}
            //进入组件预处理
            var preLoad = this.curRoute.preLoad;
            if(preLoad){
            	preLoad();
            }
		},
		
		//加载后处理
		handlePostLoad:function(response,status,xhr){
			//progress start
            try{
            	if(status == 'error'){
            		if(this.$refs.topProgress ){
                		this.$refs.topProgress.fail();
                	}
            		console.error(response);
            	}else{
                	if(this.$refs.topProgress ){
                		this.$refs.topProgress.done();
                	}
            	}
            }catch(err){
            }
			//挂载组件
			this.view = this.curRoute.componentCode;
 			
			//记录路由轨迹
			this.__trackRecord();
			
			//后处理
			this.__postLoad();

		},
		
		//加载路由后处理
		__postLoad:function(){
  	        document.body.scrollTop = 0;
  	        document.documentElement.scrollTop = 0;
			var postLoad = this.curRoute.postLoad;
			if(postLoad){
				postLoad();
			}
		},
		
		//记录轨迹
		__trackRecord:function(){
			this.trackRecord.push(Object.assign({route:this.viewName},this.nextRoute));
		},
		
		
		/**
		以下为动画事件,可以不处理
		**/
		 // --------
		  // 进入中
		  // --------
		  beforeEnter: function (el) {
		    // ...
		  },
		  // 此回调函数是可选项的设置
		  // 与 CSS 结合时使用
		  enter: function (el, done) {
		    done()
		  },
		  afterEnter: function (el) {
		    // ...
		  },
		  enterCancelled: function (el) {
		    // ...
		  },
		  // --------
		  // 离开时
		  // --------
		  beforeLeave: function (el) {
		    // ...
		  },
		  // 此回调函数是可选项的设置
		  // 与 CSS 结合时使用
		  leave: function (el, done) {
		    // ...
		    done()
		  },
		  afterLeave: function (el) {
		    // ...
		  },
		  // leaveCancelled 只用于 v-show 中
		  leaveCancelled: function (el) {
		    // ...
		  }
	},
	computed: {
		//当前路由
		curRoute:function(){
			var ret = {}
			if(this.viewName && this.routes[this.viewName] && (this.routes[this.viewName].componentCode
					|| this.routes[this.viewName].url)){
				Object.assign(ret, this.routes[this.viewName])
				Object.assign(ret,this.navigator[this.navigator.length-1])
			}else{
				ret =  this.errorRoute;
			}
			return ret;
		},
		//error route
		errorRoute : function(){
			return this.routes['error'] ? this.routes['error'] : 
				{route:'error',componentCode:'app-error',url:'../app/error',passProps: {errMsg:'找不到页面'}}
		},
		//组件url
		url :function(){
			if(this.viewName){
				return  this.curRoute.url;
			}else{
				return '';
			}
		},
		//获取组件编码
		componentCode:function(){
			if(this.viewName){
				return  this.curRoute.componentCode;
			}else{
				return '';
			}
			
		},
		//keepAlive的组件
		keepAliveComponent:function(){
			var ret =  "";
			for(var key in this.routes){
				if(this.routes[key].keep){
					ret = ret + (this.routes[key].componentCode)+",";
				}
			}
			if(ret){
				return  ret.substr(0, ret.length - 1);
			}else{
				return []
			}
			
		},
		nav:function(){
			return {
				push:this.push,
				pop:this.pop,
				replace:this.replace,
				resetTo:this.resetTo,
				backTo:this.backTo,
				popToTop:this.popToTop,
			}
		},
		passProps:function(){
			return this.curRoute.passProps ? this.curRoute.passProps : {}
		}
	},
	watch:{
		viewName:function(newVal,oldVal){
			this.doRoute();
		},
		navigator:function(newVal,oldVal){
			//取最后一条数据
			this.viewName = newVal[newVal.length-1].route;
		},
		initView:function(){
			this.navigator = [];
			this.navigator.push({route: this.initView});
		}
		
	}
});