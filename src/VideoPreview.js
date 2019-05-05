import React from 'react';

import AnimationData from './AnimationData'
import * as PIXI from 'pixi.js'
import BackgroundRaw from './BackgroundRaw.mp4'
import VideoData from './VideoData'

class VideoPreview extends React.Component {
    componentDidMount() {

        const app = new PIXI.Application({
            width: 1920, 
            height: 1080, 
            transparent:true,
            resolution: window.devicePixelRatio || 1, 
            view: this.refs.canvas
        });

        //start renderer
        var renderer = PIXI.autoDetectRenderer(1920,1080,{ antialias: false });
        var stage = new PIXI.Container();
        
        //background video setup
        var texture = PIXI.Texture.from(BackgroundRaw);
        var videoSprite = new PIXI.Sprite(texture);
        videoSprite.width = app.screen.width;
        videoSprite.height = app.screen.height;
        app.stage.addChild(videoSprite);

        //Setup the graphics objects for the animated bars
        var thing = new PIXI.Graphics();
        var thing_mask = new PIXI.Graphics();
        app.stage.addChild(thing);       
        app.stage.addChild(thing_mask);  
        
        //Aniamted bar colors
        var rgb = VideoData.text_background_color;
        var rgb_n = [rgb[0]/255, rgb[1]/255, rgb[2]/255, rgb[3]/255]
        var color = PIXI.utils.rgb2hex(rgb_n); 

        //Text colors
        rgb = VideoData.highlight_color;
        rgb_n = [rgb[0]/255, rgb[1]/255, rgb[2]/255, rgb[3]/255]
        var text_highlight_color = PIXI.utils.rgb2hex(rgb_n);
        var text_color = PIXI.utils.rgb2hex([1,1,1,0]);

        //dual-style-text is done by stacking two text elements.  Text not belonging
        //to a layer's text style is replaced with whitespace.  This works better for monospace
        //fonts.  Better solutions, like pixi-multistyle-text should be considered here.
        var text_styles = [] //0 is standard text style, 1 is highlight
        for (let i = 0; i < 2; i++){
            text_styles.push(new PIXI.TextStyle({
                fontFamily: VideoData.font,
                fontSize: 83,
                dropShadowColor: 'black',
                dropShadow:true,
                dropShadowDistance:1,
                letterSpacing:1
            }))};

        function MakeWhitespace(text, StartIndex, EndIndex){
            let whitespace = " "
            for (let i = StartIndex; i < EndIndex; i++){
                whitespace += "   "
            }
            return text.substr(0, StartIndex) + whitespace + text.substr(EndIndex);
        }

        //format the text elements so that they only include their respective characters.
        var text_elements = []
        for (let i =0; i < VideoData.text.length; i++){
            text_elements[i] = []
            let indexes = VideoData.text[i].keyword_indexes;
            
            //set properties of highlighted text
            let highlight_text = VideoData.text[i].content.substring(0, indexes[1]);
            highlight_text = MakeWhitespace(highlight_text, 0, indexes[0]);
            text_elements[i].push(new PIXI.Text(highlight_text, text_styles[1]));
            text_elements[i][0].position.y = AnimationData.text[i].y_pos;
            text_elements[i][0].position.x = AnimationData.text[i].highlight_x_pos;
            text_elements[i][0].style.fill = text_highlight_color;
            
            //set properties of plain text
            let whitespace_text = MakeWhitespace(VideoData.text[i].content, indexes[0], indexes[1]);
            text_elements[i].push(new PIXI.Text(whitespace_text, text_styles[0]));
            text_elements[i][1].position.y = AnimationData.text[i].y_pos;
            text_elements[i][1].position.x = 88;
            text_elements[i][1].style.fill = text_color;
        }        
        
        //The sync_unit value is use to sync the sequence 'frame' duration in 
        //VideoData with the animate() iteration increments.  This multiple needs to change to 
        //accommodate the variation in playback performance.  This should be replaced with 
        //app.ticker.add()
        var sync_unit = 16.3;
        // var sync_unit = 35;
        
        
        
        var count = 0;
        animate();
        function animate() {
            count += sync_unit;

            thing.clear();
            thing_mask.clear();

            //trigger video repeat
            if (count > VideoData.duration){
                //sometimes needs baseTexture.source, sometimes needs baseTexture.resource
                videoSprite.texture.baseTexture.source.currentTime = 0;
                videoSprite.texture.baseTexture.source.play();
                count = 0;
            }
            
            //bar animation done with reveal start/end and scrub start/end time values
            for (let i =0; i < AnimationData.bars.length; i++){
                let current_bar = AnimationData.bars[i];        
                let bar_reveal_duration = current_bar.reveal_end - current_bar.reveal_start;
                let bar_scrub_duration = current_bar.scrub_end - current_bar.scrub_start;                    
                
                //bar animation
                if (count > current_bar.reveal_start){                    
                    let bar_reveal_percent = (count - current_bar.reveal_start) / bar_reveal_duration;
                    let active_width = bar_reveal_percent*current_bar.width
                    
                    thing.position.x = 80;
                    thing_mask.position.x = 80;
                    
                    //reveal transition
                    if (count < current_bar.reveal_end){
                        active_width = bar_reveal_percent*current_bar.width;
                    }
                    
                    //static placement
                    if (count > current_bar.reveal_end){
                        active_width = current_bar.width;
                    }
                    
                    //scrub transition
                    if (count > current_bar.scrub_start){
                        let bar_scrub_percent = (count - current_bar.scrub_start) / bar_scrub_duration;                    
                        // console.log(bar_scrub_percent)
                        active_width = Math.max(((1-bar_scrub_percent)*current_bar.width), 0);
                        thing.position.x += (current_bar.width+thing.position.x) * (bar_scrub_percent*2);
                        thing_mask.position.x += (current_bar.width+thing_mask.position.x) * (bar_scrub_percent*2);
                    }

                    thing.lineStyle(90, String(color), 1);
                    thing.moveTo(0,current_bar.y_pos); 
                    thing.lineTo(active_width, current_bar.y_pos);
                    thing.endFill();        
                    
                    thing_mask.lineStyle(90, String(text_highlight_color), 1);
                    thing_mask.moveTo(0,current_bar.y_pos); 
                    thing_mask.lineTo(active_width, current_bar.y_pos);
                    thing_mask.endFill();                            
                }
            }


            //text animation
            for (let i =0; i < VideoData.text.length; i++){
                let current_text = AnimationData.text[i];
                let text_count = Math.max(count - current_text.reveal_start, 0);
                let text_reveal_duration = current_text.reveal_end - current_text.reveal_start;
                let text_reveal_percent = Math.min((text_count / text_reveal_duration), 1);
                
                if (count > AnimationData.text[i].reveal_start){                    
                    if (count < AnimationData.text[i].reveal_end){
                        for (let j = 0; j < text_elements[i].length; j++){
                            text_elements[i][j].alpha = text_reveal_percent;
                            text_elements[i][j].mask = thing_mask;
                            text_elements[i][j].position.y = AnimationData.text[i].y_pos - ((1-text_reveal_percent)*-5)
                            app.stage.addChild(text_elements[i][j]);
                        }
                    }
                    if (count > AnimationData.text[i].hide){
                        app.stage.removeChild(text_elements[i][0]);
                        app.stage.removeChild(text_elements[i][1]);
                    }
                }
            }        
            renderer.render(stage);
            requestAnimationFrame( animate );
        }
    }

    render() 
    {
        return (
            <div className="lefts-border-line manufacturer-panel">
                <h1 className="manufacturer-title">
                    Video Preview
                </h1>
                <hr/>
                <div className="video-container">
                    <div className="aspect-ratio-fixer">
                        <div className="use-aspect-ratio">
                            <canvas ref="canvas" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default VideoPreview;
